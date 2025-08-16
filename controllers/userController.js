const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -refreshTokens -backupCodes')
      .populate('tradingStats');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      bio,
      phone,
      dateOfBirth,
      country,
      timezone,
      notifications,
      tradingPreferences,
      riskManagement
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update basic profile fields
    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.profile.bio = bio;
    if (phone !== undefined) user.profile.phone = phone;
    if (dateOfBirth !== undefined) user.profile.dateOfBirth = dateOfBirth;
    if (country !== undefined) user.profile.country = country;
    if (timezone !== undefined) user.profile.timezone = timezone;

    // Update settings
    if (notifications) {
      user.settings.notifications = { ...user.settings.notifications, ...notifications };
    }
    if (tradingPreferences) {
      user.settings.tradingPreferences = { ...user.settings.tradingPreferences, ...tradingPreferences };
    }
    if (riskManagement) {
      user.settings.riskManagement = { ...user.settings.riskManagement, ...riskManagement };
    }

    user.updatedAt = new Date();
    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password -refreshTokens -backupCodes');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Change user password
// @route   PUT /api/user/password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedNewPassword;
    user.passwordChangedAt = new Date();
    user.updatedAt = new Date();

    // Clear all refresh tokens (force re-login on all devices)
    user.refreshTokens = [];

    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Upload profile picture
// @route   POST /api/user/profile-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete old profile picture from Cloudinary if exists
    if (user.profile.profilePicture && user.profile.profilePicture.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(user.profile.profilePicture.cloudinaryPublicId);
      } catch (error) {
        console.error('Error deleting old profile picture:', error);
      }
    }

    // Upload new profile picture to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'tradejournal/profile-pictures',
      transformation: [
        { width: 200, height: 200, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
      ]
    });

    // Update user profile picture
    user.profile.profilePicture = {
      url: result.secure_url,
      cloudinaryPublicId: result.public_id
    };
    user.updatedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePicture: user.profile.profilePicture
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Delete profile picture
// @route   DELETE /api/user/profile-picture
// @access  Private
const deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.profile.profilePicture || !user.profile.profilePicture.cloudinaryPublicId) {
      return res.status(400).json({
        success: false,
        error: 'No profile picture to delete'
      });
    }

    // Delete profile picture from Cloudinary
    try {
      await cloudinary.uploader.destroy(user.profile.profilePicture.cloudinaryPublicId);
    } catch (error) {
      console.error('Error deleting profile picture from Cloudinary:', error);
    }

    // Remove profile picture from user document
    user.profile.profilePicture = {
      url: '',
      cloudinaryPublicId: ''
    };
    user.updatedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Profile picture deleted successfully'
    });
  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get user settings
// @route   GET /api/user/settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('settings');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update user settings
// @route   PUT /api/user/settings
// @access  Private
const updateSettings = async (req, res) => {
  try {
    const { notifications, tradingPreferences, riskManagement } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update settings
    if (notifications) {
      user.settings.notifications = { ...user.settings.notifications, ...notifications };
    }
    if (tradingPreferences) {
      user.settings.tradingPreferences = { ...user.settings.tradingPreferences, ...tradingPreferences };
    }
    if (riskManagement) {
      user.settings.riskManagement = { ...user.settings.riskManagement, ...riskManagement };
    }

    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: user.settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/user/account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to delete account'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // Delete profile picture from Cloudinary if exists
    if (user.profile.profilePicture && user.profile.profilePicture.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(user.profile.profilePicture.cloudinaryPublicId);
      } catch (error) {
        console.error('Error deleting profile picture during account deletion:', error);
      }
    }

    // Delete all user's trades
    const Trade = require('../models/Trade');
    await Trade.deleteMany({ userId: user._id });

    // Delete user account
    await User.findByIdAndDelete(user._id);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  deleteProfilePicture,
  getSettings,
  updateSettings,
  deleteAccount
};
