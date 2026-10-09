const User = require('../models/User');
const Consumer = require('../models/Consumer');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const { sendPasswordResetEmail, getLastSentEmail } = require('../services/emailService');

// Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// HttpOnly Cookie Configuration adhering to cross-origin deployment (Vercel -> Render)
const getCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
});

// Generate JWT Token Function
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// @desc    Register a new consumer
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    try {
        const { name, email, password, serviceNumber, sanctionedLoadKw, connectionType, district } = req.body;
        const normalizedEmail = email ? email.toLowerCase().trim() : '';
        const userDistrict = (district && district.trim()) ? district.trim() : 'Chennai';

        if (!name || !normalizedEmail || !password || !serviceNumber) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }

        const validConnectionTypes = ['LT-1A_DOMESTIC', 'LT-V_COMMERCIAL', 'LT-IIIB_INDUSTRIAL'];
        const selectedConnectionType = validConnectionTypes.includes(connectionType) ? connectionType : 'LT-1A_DOMESTIC';

        // Determine tariff category based on connection type
        let tariffCategory = 'LT-1A';
        if (selectedConnectionType === 'LT-IIIB_INDUSTRIAL') {
            tariffCategory = 'LT-3B';
        } else if (selectedConnectionType === 'LT-V_COMMERCIAL') {
            tariffCategory = 'LT-5';
        }

        // 1. Check if user already exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'Email is already registered' });
        }

        const serviceExists = await Consumer.findOne({ serviceNumber: serviceNumber.trim() });
        if (serviceExists) {
            return res.status(400).json({ success: false, message: 'Service number is already attached to an account' });
        }

        // 2. Create the User Profile with PENDING status and no pre-approved KYC
        const user = await User.create({ 
            name: name.trim(), 
            email: normalizedEmail, 
            password, 
            role: 'CONSUMER',
            connectionType: selectedConnectionType,
            district: userDistrict,
            verificationStatus: 'PENDING',
            kycDocuments: []
        });

        // 3. Create the Consumer Metadata Profile
        const consumer = await Consumer.create({
            user: user._id,
            serviceNumber: serviceNumber.trim(),
            sanctionedLoadKw: Number(sanctionedLoadKw) || (selectedConnectionType === 'LT-IIIB_INDUSTRIAL' ? 10.0 : 2.0),
            connectionType: selectedConnectionType,
            tariffCategory: tariffCategory,
            district: userDistrict,
            address: {
                city: userDistrict,
                district: userDistrict
            },
            verificationStatus: 'PENDING',
            kycDocuments: []
        });

        // 4. Generate Token & Issue HttpOnly Cookie
        const token = generateToken(user._id);
        res.cookie('token', token, getCookieOptions());

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                connectionType: user.connectionType,
                district: user.district,
                verificationStatus: user.verificationStatus,
                serviceNumber: consumer.serviceNumber,
                sanctionedLoadKw: consumer.sanctionedLoadKw
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Login user & issue HttpOnly cookie
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email ? email.toLowerCase().trim() : '';

        if (!normalizedEmail || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        // 1. Find user
        const user = await User.findOne({ email: normalizedEmail });

        // 2. Verify password and issue HttpOnly cookie
        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);
            const consumerProfile = await Consumer.findOne({ user: user._id });

            res.cookie('token', token, getCookieOptions());
            
            res.json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    connectionType: user.connectionType || consumerProfile?.connectionType || 'LT-1A_DOMESTIC',
                    verificationStatus: user.verificationStatus || consumerProfile?.verificationStatus || 'PENDING',
                    serviceNumber: consumerProfile?.serviceNumber || null,
                    sanctionedLoadKw: consumerProfile?.sanctionedLoadKw || null,
                    kycDocuments: user.kycDocuments || consumerProfile?.kycDocuments || []
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Google OAuth 2.0 Sign-in / Explicit Consumer Provisioning
// @route   POST /api/auth/google
const googleAuth = async (req, res) => {
    try {
        const { credential, idToken, accessToken, serviceNumber, connectionType, sanctionedLoadKw } = req.body;
        const tokenToVerify = credential || idToken;

        if (!tokenToVerify && !accessToken) {
            return res.status(400).json({ success: false, message: 'Google credential or access token is required' });
        }

        let payload = null;

        // 1. If accessToken provided (e.g. from useGoogleLogin custom button)
        if (accessToken) {
            try {
                const googleRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                payload = googleRes.data;
            } catch (axErr) {
                console.warn('Google userinfo fetch note:', axErr.message);
            }
        }

        // 2. If credential/idToken provided (e.g. from GoogleLogin)
        if (!payload && tokenToVerify) {
            try {
                const ticket = await googleClient.verifyIdToken({
                    idToken: tokenToVerify,
                    audience: process.env.GOOGLE_CLIENT_ID || undefined
                });
                payload = ticket.getPayload();
            } catch (verifyError) {
                console.warn('Google verifyIdToken note:', verifyError.message);
                // Fallback decode for local development / testing with simulated tokens
                if (process.env.NODE_ENV === 'development') {
                    const decoded = jwt.decode(tokenToVerify);
                    if (decoded && (decoded.email || decoded.sub)) {
                        payload = decoded;
                    }
                }
            }
        }

        if (!payload) {
            return res.status(401).json({ success: false, message: 'Invalid Google authentication token' });
        }

        const googleId = payload.sub;
        const normalizedEmail = (payload.email || '').toLowerCase().trim();
        const displayName = payload.name || normalizedEmail.split('@')[0] || 'TN Consumer';
        const avatar = payload.picture || null;

        if (!normalizedEmail) {
            return res.status(400).json({ success: false, message: 'Google account does not provide an email address' });
        }

        // 1. Check if user already exists
        let user = await User.findOne({ email: normalizedEmail });

        // If user does NOT exist, check if connection details were provided
        if (!user) {
            if (!serviceNumber) {
                // Inform frontend that this new Google user needs to provide service number, category, and load
                return res.status(200).json({
                    success: true,
                    requiresOnboarding: true,
                    profile: {
                        name: displayName,
                        email: normalizedEmail,
                        avatar: avatar,
                        googleId: googleId
                    }
                });
            }

            // Verify unique service number
            const serviceExists = await Consumer.findOne({ serviceNumber: serviceNumber.trim() });
            if (serviceExists) {
                return res.status(400).json({ success: false, message: 'Service number is already attached to an account' });
            }

            const validConnectionTypes = ['LT-1A_DOMESTIC', 'LT-V_COMMERCIAL', 'LT-IIIB_INDUSTRIAL'];
            const selectedConnectionType = validConnectionTypes.includes(connectionType) ? connectionType : 'LT-1A_DOMESTIC';

            let tariffCategory = 'LT-1A';
            if (selectedConnectionType === 'LT-IIIB_INDUSTRIAL') {
                tariffCategory = 'LT-3B';
            } else if (selectedConnectionType === 'LT-V_COMMERCIAL') {
                tariffCategory = 'LT-5';
            }

            // Provision new User: KYC Status is strictly PENDING until document upload + admin approval
            user = await User.create({
                name: displayName,
                email: normalizedEmail,
                googleId: googleId,
                avatar: avatar,
                role: 'CONSUMER',
                connectionType: selectedConnectionType,
                verificationStatus: 'PENDING',
                kycDocuments: [],
                isActive: true
            });

            const userDistrict = (req.body.district && req.body.district.trim()) ? req.body.district.trim() : 'Chennai';

            // Create Consumer Profile with provided Service Number, Category, Load & District
            await Consumer.create({
                user: user._id,
                serviceNumber: serviceNumber.trim(),
                sanctionedLoadKw: Number(sanctionedLoadKw) || (selectedConnectionType === 'LT-IIIB_INDUSTRIAL' ? 10.0 : 2.0),
                connectionType: selectedConnectionType,
                tariffCategory: tariffCategory,
                district: userDistrict,
                address: {
                    district: userDistrict,
                    city: userDistrict
                },
                verificationStatus: 'PENDING',
                kycDocuments: []
            });
        } else {
            // Update googleId or avatar if not yet attached
            let modified = false;
            if (!user.googleId && googleId) {
                user.googleId = googleId;
                modified = true;
            }
            if (!user.avatar && avatar) {
                user.avatar = avatar;
                modified = true;
            }
            if (modified) {
                await user.save();
            }
        }

        // Ensure consumer profile exists
        let consumerProfile = await Consumer.findOne({ user: user._id });
        if (!consumerProfile) {
            // If existing user lacks consumer profile and serviceNumber provided
            if (serviceNumber) {
                const validConnectionTypes = ['LT-1A_DOMESTIC', 'LT-V_COMMERCIAL', 'LT-IIIB_INDUSTRIAL'];
                const selectedConnectionType = validConnectionTypes.includes(connectionType) ? connectionType : (user.connectionType || 'LT-1A_DOMESTIC');
                let tariffCategory = 'LT-1A';
                if (selectedConnectionType === 'LT-IIIB_INDUSTRIAL') tariffCategory = 'LT-3B';
                else if (selectedConnectionType === 'LT-V_COMMERCIAL') tariffCategory = 'LT-5';

                consumerProfile = await Consumer.create({
                    user: user._id,
                    serviceNumber: serviceNumber.trim(),
                    sanctionedLoadKw: Number(sanctionedLoadKw) || 2.0,
                    connectionType: selectedConnectionType,
                    tariffCategory: tariffCategory,
                    verificationStatus: user.verificationStatus || 'PENDING',
                    kycDocuments: user.kycDocuments || []
                });
            } else {
                return res.status(200).json({
                    success: true,
                    requiresOnboarding: true,
                    profile: {
                        name: user.name || displayName,
                        email: normalizedEmail,
                        avatar: user.avatar || avatar,
                        googleId: user.googleId || googleId
                    }
                });
            }
        }

        // 2. Issue JWT via HttpOnly Cookie
        const token = generateToken(user._id);
        res.cookie('token', token, getCookieOptions());

        return res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                connectionType: user.connectionType || consumerProfile?.connectionType || 'LT-1A_DOMESTIC',
                verificationStatus: user.verificationStatus || consumerProfile?.verificationStatus || 'PENDING',
                serviceNumber: consumerProfile?.serviceNumber || null,
                sanctionedLoadKw: consumerProfile?.sanctionedLoadKw || null,
                avatar: user.avatar || null,
                kycDocuments: user.kycDocuments || consumerProfile?.kycDocuments || []
            }
        });
    } catch (error) {
        console.error('Google Auth Controller Error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Google authentication failed' });
    }
};

// @desc    Logout user & clear HttpOnly cookie
// @route   POST /api/auth/logout
const logoutUser = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get current user session
// @route   GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const user = req.user;
        const consumerProfile = await Consumer.findOne({ user: user._id });

        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                verificationStatus: user.verificationStatus || consumerProfile?.verificationStatus || 'PENDING',
                connectionType: user.connectionType || consumerProfile?.connectionType || 'LT-1A_DOMESTIC',
                district: user.district || consumerProfile?.district || 'Chennai',
                kycDocuments: user.kycDocuments || consumerProfile?.kycDocuments || [],
                serviceNumber: consumerProfile?.serviceNumber || null,
                sanctionedLoadKw: consumerProfile?.sanctionedLoadKw || null,
                avatar: user.avatar || null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Upload KYC document (Aadhar / Property Tax)
// @route   POST /api/auth/kyc/upload
// @access  Private
const uploadKycDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a PDF or image document (Aadhar / Property Tax).' });
        }

        const documentPath = `/uploads/kyc/${req.file.filename}`;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }

        const connectionType = req.body.connectionType || user.connectionType || 'LT-1A_DOMESTIC';

        // Update User Profile
        user.kycDocuments.push(documentPath);
        user.verificationStatus = 'PENDING';
        user.connectionType = connectionType;
        await user.save();

        // Update Consumer Metadata Profile
        const consumer = await Consumer.findOne({ user: user._id });
        if (consumer) {
            consumer.kycDocuments.push(documentPath);
            consumer.verificationStatus = 'PENDING';
            consumer.connectionType = connectionType;
            consumer.tariffCategory = connectionType === 'LT-V_COMMERCIAL' ? 'LT-5' : 'LT-1A';
            await consumer.save();
        }

        res.status(200).json({
            success: true,
            message: 'KYC Document submitted successfully and is now pending admin approval.',
            data: {
                verificationStatus: user.verificationStatus,
                connectionType: user.connectionType,
                kycDocuments: user.kycDocuments,
                latestDocument: documentPath
            }
        });
    } catch (error) {
        console.error('KYC Upload Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete an uploaded KYC document
// @route   DELETE /api/auth/kyc/document
// @access  Private
const deleteKycDocument = async (req, res) => {
    try {
        const documentPath = req.body?.documentPath || req.query?.documentPath;
        if (!documentPath) {
            return res.status(400).json({ 
                success: false, 
                message: 'Document path is required.' 
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }

        // Verify document belongs to this user
        const docIndex = (user.kycDocuments || []).indexOf(documentPath);
        if (docIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Document not found in user records.' 
            });
        }

        // Remove from User document list
        user.kycDocuments.splice(docIndex, 1);
        await user.save();

        // Also remove from Consumer document list if present
        const consumer = await Consumer.findOne({ user: user._id });
        if (consumer && consumer.kycDocuments) {
            consumer.kycDocuments = consumer.kycDocuments.filter(doc => doc !== documentPath);
            await consumer.save();
        }

        // Safely remove the physical file from the disk storage
        try {
            const fileName = path.basename(documentPath);
            const uploadDir = path.resolve(__dirname, '../../uploads/kyc');
            const filePath = path.join(uploadDir, fileName);

            // Guard against path traversal attacks
            if (filePath.startsWith(uploadDir) && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (fileErr) {
            console.warn('Physical file deletion warning:', fileErr.message);
        }

        res.status(200).json({
            success: true,
            message: 'KYC document removed successfully.',
            data: {
                kycDocuments: user.kycDocuments,
                verificationStatus: user.verificationStatus
            }
        });
    } catch (error) {
        console.error('Delete KYC Document Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Request password reset code
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email ? email.toLowerCase().trim() : '';

        if (!normalizedEmail) {
            return res.status(400).json({ success: false, message: 'Please provide your registered email address.' });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No registered consumer found with this email address.' });
        }

        // Generate 6-digit numeric verification code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordCode = resetCode;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
        await user.save();

        // Dispatch verification code to the consumer's registered email
        await sendPasswordResetEmail(user.email, resetCode, user.name || 'Valued Consumer');

        res.status(200).json({
            success: true,
            message: `A 6-digit verification code has been sent to ${user.email}. Please check your inbox and spam folder.`,
            previewCode: resetCode
        });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify reset code and set new password
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
    try {
        const { email, resetCode, newPassword } = req.body;
        const normalizedEmail = email ? email.toLowerCase().trim() : '';

        if (!normalizedEmail || !resetCode || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide email, verification code, and new password.' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found with this email.' });
        }

        if (!user.resetPasswordCode || user.resetPasswordCode !== resetCode.trim()) {
            return res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' });
        }

        if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
            return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
        }

        // Set new password (pre-save hook will hash it with bcrypt)
        user.password = newPassword;
        user.resetPasswordCode = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password has been reset successfully! Please sign in with your new password.'
        });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get latest dispatched verification email preview
// @route   GET /api/auth/latest-email
const getLatestEmail = async (req, res) => {
    try {
        const { email } = req.query;
        const latest = getLastSentEmail();

        if (!latest) {
            return res.status(404).json({ success: false, message: 'No dispatched emails found yet.' });
        }

        if (email && latest.to.toLowerCase() !== email.toLowerCase().trim()) {
            return res.status(404).json({ success: false, message: 'No recent emails found for this address.' });
        }

        res.status(200).json({
            success: true,
            data: latest
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { 
    registerUser, 
    loginUser, 
    googleAuth, 
    logoutUser, 
    getMe, 
    uploadKycDocument,
    deleteKycDocument,
    forgotPassword,
    resetPassword,
    getLatestEmail
};