const User = require('../models/User');
const Consumer = require('../models/Consumer');
const Alert = require('../models/Alert');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const { sendPasswordResetEmail, sendAdminKycNotificationEmail } = require('../services/emailService');

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
            
            const addressObj = consumerProfile?.address || user.address || {
                street: '',
                city: user.district || consumerProfile?.district || 'Chennai',
                district: user.district || consumerProfile?.district || 'Chennai',
                pincode: ''
            };

            res.json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone || consumerProfile?.phone || '',
                    role: user.role,
                    connectionType: user.connectionType || consumerProfile?.connectionType || 'LT-1A_DOMESTIC',
                    district: user.district || consumerProfile?.district || 'Chennai',
                    address: addressObj,
                    pincode: addressObj.pincode || '',
                    verificationStatus: user.verificationStatus || consumerProfile?.verificationStatus || 'PENDING',
                    serviceNumber: consumerProfile?.serviceNumber || null,
                    sanctionedLoadKw: consumerProfile?.sanctionedLoadKw || null,
                    avatar: user.avatar || null,
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

            const userDistrict = (req.body.district && req.body.district.trim()) ? req.body.district.trim() : 'Chennai';

            // Provision new User: KYC Status is strictly PENDING until document upload + admin approval
            user = await User.create({
                name: displayName,
                email: normalizedEmail,
                googleId: googleId,
                avatar: avatar,
                role: 'CONSUMER',
                connectionType: selectedConnectionType,
                district: userDistrict,
                verificationStatus: 'PENDING',
                kycDocuments: [],
                isActive: true
            });

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

        const addressObj = consumerProfile?.address || user.address || {
            street: '',
            city: user.district || consumerProfile?.district || 'Chennai',
            district: user.district || consumerProfile?.district || 'Chennai',
            pincode: ''
        };

        return res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || consumerProfile?.phone || '',
                role: user.role,
                connectionType: user.connectionType || consumerProfile?.connectionType || 'LT-1A_DOMESTIC',
                district: user.district || consumerProfile?.district || 'Chennai',
                address: addressObj,
                pincode: addressObj.pincode || '',
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
    const opts = getCookieOptions();
    delete opts.maxAge;
    res.clearCookie('token', opts);
    res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'none', path: '/' });
    res.clearCookie('token', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get current user session
// @route   GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const user = req.user;
        const consumerProfile = await Consumer.findOne({ user: user._id });

        const addressObj = consumerProfile?.address || user.address || {
            street: '',
            city: user.district || 'Chennai',
            district: user.district || 'Chennai',
            pincode: ''
        };

        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || consumerProfile?.phone || '',
                role: user.role,
                verificationStatus: user.verificationStatus || consumerProfile?.verificationStatus || 'PENDING',
                connectionType: user.connectionType || consumerProfile?.connectionType || 'LT-1A_DOMESTIC',
                district: user.district || consumerProfile?.district || 'Chennai',
                address: addressObj,
                pincode: addressObj.pincode || '',
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

        // Notify Admin of new KYC document submission
        try {
            const docTypeLabel = req.body.documentType === 'PROPERTY_TAX' 
                ? 'Property Tax Receipt' 
                : req.body.documentType === 'COMMERCIAL_LICENSE' 
                    ? 'Commercial Trade License' 
                    : 'Aadhar Card (Identity Proof)';
            const docTypeLabelTa = req.body.documentType === 'PROPERTY_TAX' 
                ? 'சொத்து வரி ரசீது' 
                : req.body.documentType === 'COMMERCIAL_LICENSE' 
                    ? 'வணிக உரிமம்' 
                    : 'ஆதார் அட்டை (அடையாளச் சான்று)';

            const serviceNo = consumer?.serviceNumber || user.serviceNumber || '04-123-001234';
            const adminUsers = await User.find({ role: 'ADMIN' });
            const adminEmailSet = new Set();
            if (process.env.ADMIN_NOTIFICATION_EMAIL) adminEmailSet.add(process.env.ADMIN_NOTIFICATION_EMAIL.trim());
            if (process.env.SMTP_USER) adminEmailSet.add(process.env.SMTP_USER.trim());
            if (process.env.EMAIL_USER) adminEmailSet.add(process.env.EMAIL_USER.trim());

            for (const admin of adminUsers) {
                if (admin.email) adminEmailSet.add(admin.email.trim());
                await Alert.create({
                    type: 'KYC_STATUS',
                    severity: 'HIGH',
                    title: `e-KYC Document Uploaded: ${user.name}`,
                    titleTa: `புதிய e-KYC ஆவணம் பதிவேற்றப்பட்டது: ${user.name}`,
                    message: `Consumer ${user.name} (Service No: ${serviceNo}, District: ${consumer?.district || user.district || 'Tamil Nadu'}) uploaded a new ${docTypeLabel} for accreditation. Please verify in the e-KYC tab.`,
                    messageTa: `நுகர்வோர் ${user.name} (இணைப்பு எண்: ${serviceNo}, மாவட்டம்: ${consumer?.district || user.district || 'தமிழ்நாடு'}) தனது அங்கீகாரத்திற்காக ${docTypeLabelTa} ஆவணத்தை சமர்ப்பித்துள்ளார். தயவுசெய்து e-KYC பகுதியில் சரிபார்க்கவும்.`,
                    consumer: consumer?._id,
                    user: admin._id,
                    isResolved: false
                });
            }

            // Also dispatch direct email alerts to all admin email addresses
            for (const adminEmail of adminEmailSet) {
                sendAdminKycNotificationEmail({
                    adminEmail: adminEmail,
                    consumerName: user.name,
                    serviceNumber: serviceNo,
                    documentType: docTypeLabel,
                    consumerEmail: user.email,
                    district: consumer?.district || user.district || 'Tamil Nadu'
                }).catch(e => console.warn('Admin KYC notification email error:', e.message));
            }
        } catch (alertErr) {
            console.error('Error notifying admin of KYC upload:', alertErr);
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
        const rawPath = req.body?.documentPath || req.query?.documentPath;
        if (!rawPath) {
            return res.status(400).json({ 
                success: false, 
                message: 'Document path is required.' 
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }

        const targetBase = path.basename(rawPath).toLowerCase();
        const targetClean = rawPath.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/+/, '').toLowerCase();
        // Extract numeric sequence or hash (e.g. 28435613 or timestamp)
        const targetNumberMatch = targetBase.match(/\d{6,}/)?.[0] || '';

        // Match helper function supporting basename, relative path, exact string, or numeric fragment
        const isMatch = (item) => {
            if (!item) return false;
            if (item === rawPath) return true;
            const itemBase = path.basename(item).toLowerCase();
            if (itemBase === targetBase) return true;
            const itemClean = item.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/+/, '').toLowerCase();
            if (itemClean === targetClean) return true;
            if (item.endsWith(targetBase) || targetBase.endsWith(itemBase)) return true;
            if (targetNumberMatch && itemBase.includes(targetNumberMatch)) return true;
            return false;
        };

        const consumer = await Consumer.findOne({ user: user._id });

        // Remove from User document list
        const initialUserCount = (user.kycDocuments || []).length;
        user.kycDocuments = (user.kycDocuments || []).filter(doc => !isMatch(doc));
        user.markModified('kycDocuments');
        if (user.kycDocuments.length === 0 && user.verificationStatus !== 'APPROVED') {
            user.verificationStatus = 'PENDING';
        }
        await user.save();

        // Also remove from Consumer document list if present
        if (consumer && consumer.kycDocuments) {
            consumer.kycDocuments = (consumer.kycDocuments || []).filter(doc => !isMatch(doc));
            consumer.markModified('kycDocuments');
            if (consumer.kycDocuments.length === 0 && consumer.verificationStatus !== 'APPROVED') {
                consumer.verificationStatus = 'PENDING';
            }
            await consumer.save();
        }

        // Safely remove the physical file from the disk storage
        try {
            const fileName = path.basename(targetBase);
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
        const dispatchResult = await sendPasswordResetEmail(user.email, resetCode, user.name || 'Valued Consumer');

        if (!dispatchResult.success) {
            console.error(`[AUTH FORGOT PASSWORD ERROR] Dispatch failed for ${user.email}:`, dispatchResult.error);
            return res.status(500).json({
                success: false,
                message: `Failed to deliver verification code email to ${user.email}: ${dispatchResult.error || 'Mail delivery error'}. Please verify your network or SMTP configuration.`
            });
        }

        res.status(200).json({
            success: true,
            message: `A 6-digit verification code has been successfully dispatched to ${user.email}. Please check your inbox and spam folder.`,
            email: user.email,
            method: dispatchResult.method
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

// @desc    Update consumer profile (name, email, phone, address, district, pincode, service connection number)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const { 
            name, 
            email, 
            phone, 
            address, 
            street, 
            city, 
            district, 
            pincode, 
            serviceNumber, 
            connectionType,
            consumerId,
            userId 
        } = req.body;

        // If requester is ADMIN, allow targeting a specific consumer/user profile
        let targetUserId = req.user._id;
        if (req.user.role === 'ADMIN') {
            if (userId) {
                targetUserId = userId;
            } else if (consumerId) {
                const targetC = await Consumer.findById(consumerId);
                if (targetC && targetC.user) targetUserId = targetC.user;
            } else if (email) {
                const matchUser = await User.findOne({ email: email.toLowerCase().trim() });
                if (matchUser && matchUser.role !== 'ADMIN') {
                    targetUserId = matchUser._id;
                }
            }
        }

        const user = await User.findById(targetUserId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }

        // Validate unique email if changing email - MUST exclude this user's own _id!
        if (email) {
            const normalizedEmail = email.toLowerCase().trim();
            if (normalizedEmail !== (user.email || '').toLowerCase().trim()) {
                const existingUser = await User.findOne({ 
                    email: normalizedEmail,
                    _id: { $ne: user._id }
                });
                if (existingUser) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Email address is already in use by another account.' 
                    });
                }
                user.email = normalizedEmail;
            }
        }

        if (name && name.trim()) user.name = name.trim();
        if (phone !== undefined) user.phone = phone.trim();
        if (district && district.trim()) user.district = district.trim();

        // Address resolution
        const streetVal = street || (typeof address === 'object' ? address.street : address) || user.address?.street || '';
        const cityVal = city || (typeof address === 'object' ? address.city : null) || user.district || district || 'Chennai';
        const districtVal = district || (typeof address === 'object' ? address.district : null) || user.district || 'Chennai';
        const pincodeVal = pincode || (typeof address === 'object' ? address.pincode : null) || user.address?.pincode || '';

        user.address = {
            street: streetVal,
            city: cityVal,
            district: districtVal,
            pincode: pincodeVal
        };

        if (connectionType) {
            user.connectionType = connectionType;
        }

        await user.save();

        // Update or create linked Consumer Profile
        let consumer = await Consumer.findOne({ user: user._id });

        if (serviceNumber && serviceNumber.trim()) {
            const cleanServiceNo = serviceNumber.trim();
            const existingConsumer = await Consumer.findOne({ 
                serviceNumber: cleanServiceNo,
                user: { $ne: user._id }
            });
            if (existingConsumer) {
                return res.status(400).json({
                    success: false,
                    message: `Service connection number ${cleanServiceNo} is already registered to another consumer.`
                });
            }
            if (consumer) {
                consumer.serviceNumber = cleanServiceNo;
            }
        }

        if (consumer) {
            consumer.district = districtVal;
            consumer.phone = phone !== undefined ? phone.trim() : consumer.phone;
            consumer.address = {
                street: streetVal,
                city: cityVal,
                district: districtVal,
                pincode: pincodeVal
            };
            if (connectionType) {
                consumer.connectionType = connectionType;
                consumer.tariffCategory = connectionType === 'LT-V_COMMERCIAL' ? 'LT-5' : (connectionType === 'LT-IIIB_INDUSTRIAL' ? 'LT-3B' : 'LT-1A');
            }
            await consumer.save();
        } else if (serviceNumber && serviceNumber.trim()) {
            consumer = await Consumer.create({
                user: user._id,
                serviceNumber: serviceNumber.trim(),
                district: districtVal,
                phone: phone !== undefined ? phone.trim() : '',
                address: {
                    street: streetVal,
                    city: cityVal,
                    district: districtVal,
                    pincode: pincodeVal
                },
                connectionType: user.connectionType || 'LT-1A_DOMESTIC',
                tariffCategory: user.connectionType === 'LT-V_COMMERCIAL' ? 'LT-5' : 'LT-1A',
                verificationStatus: user.verificationStatus || 'PENDING'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Consumer profile updated successfully.',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || consumer?.phone || '',
                district: user.district,
                role: user.role,
                verificationStatus: user.verificationStatus || consumer?.verificationStatus || 'PENDING',
                connectionType: user.connectionType || consumer?.connectionType || 'LT-1A_DOMESTIC',
                kycDocuments: user.kycDocuments || consumer?.kycDocuments || [],
                serviceNumber: consumer?.serviceNumber || null,
                address: consumer?.address || user.address,
                pincode: pincodeVal,
                sanctionedLoadKw: consumer?.sanctionedLoadKw || null,
                avatar: user.avatar || null
            }
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
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
    updateProfile,
    forgotPassword,
    resetPassword
};