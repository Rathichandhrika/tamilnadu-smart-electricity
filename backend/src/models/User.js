const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { 
        type: String, 
        required: function() {
            // Password only required if not signing in via Google SSO
            return !this.googleId;
        } 
    },
    googleId: { type: String, default: null },
    avatar: { type: String, default: null },
    role: { 
        type: String, 
        enum: ['CONSUMER', 'ADMIN', 'RESEARCHER'], 
        default: 'CONSUMER' 
    },
    verificationStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },
    kycDocuments: [{
        type: String
    }],
    connectionType: {
        type: String,
        enum: ['LT-1A_DOMESTIC', 'LT-V_COMMERCIAL', 'LT-IIIB_INDUSTRIAL'],
        default: 'LT-1A_DOMESTIC'
    },
    district: {
        type: String,
        default: 'Chennai',
        trim: true
    },
    resetPasswordCode: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Hash password before saving if present
userSchema.pre('save', async function() {
    if (!this.password || !this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method with safe check
userSchema.methods.matchPassword = async function(enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);