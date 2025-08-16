const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  refreshToken,
  setup2FA,
  verify2FA,
  disable2FA,
  generateBackupCodes
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/refresh-token', refreshToken);

// Protected routes
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Profile picture routes
router.post('/profile-picture', protect, async (req, res) => {
  try {
    const { profilePicture } = req.body;
    
    if (!profilePicture) {
      return res.status(400).json({ message: 'Profile picture data is required' });
    }
    
    // Update user's profile picture in database
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { profilePicture }, 
      { new: true, runValidators: true }
    ).select('-password');
    
    console.log('✅ Profile picture updated for user:', req.user.id);
    res.json({ user, message: 'Profile picture updated successfully' });
  } catch (error) {
    console.error('❌ Error updating profile picture:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/profile-picture', protect, async (req, res) => {
  try {
    // Remove user's profile picture from database
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { profilePicture: null }, 
      { new: true, runValidators: true }
    ).select('-password');
    
    console.log('✅ Profile picture deleted for user:', req.user.id);
    res.json({ user, message: 'Profile picture deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting profile picture:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', protect, logout);
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify', protect, verify2FA);
router.post('/2fa/disable', protect, disable2FA);
router.post('/2fa/backup-codes', protect, generateBackupCodes);

module.exports = router;
