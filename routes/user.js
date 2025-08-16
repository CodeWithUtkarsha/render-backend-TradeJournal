const express = require('express');
const { 
  getProfile,
  updateProfile,
  deleteAccount,
  changePassword,
  uploadProfilePicture,
  deleteProfilePicture,
  getSettings,
  updateSettings
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validateUpdateProfile, validateChangePassword } = require('../middleware/validation');

const router = express.Router();

// Protected user routes
router.use(protect); // All routes require authentication

// Current user profile routes
router.route('/profile')
  .get(getProfile)
  .put(validateUpdateProfile, updateProfile);

router.post('/profile/upload-picture', uploadProfilePicture);
router.delete('/profile/delete-picture', deleteProfilePicture);
router.put('/change-password', validateChangePassword, changePassword);
router.delete('/delete-account', deleteAccount);

// User settings
router.route('/settings')
  .get(getSettings)
  .put(updateSettings);

module.exports = router;
