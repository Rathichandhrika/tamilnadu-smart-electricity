const express = require('express');
const router = express.Router();
const { 
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
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.post('/logout', logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/latest-email', getLatestEmail);
router.get('/me', protect, getMe);
router.post('/kyc/upload', protect, upload.single('document'), uploadKycDocument);
router.delete('/kyc/document', protect, deleteKycDocument);

module.exports = router;