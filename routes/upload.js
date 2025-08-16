const express = require('express');
const { 
  uploadProfilePicture,
  uploadTradeScreenshot,
  uploadTradeScreenshots,
  uploadCSV,
  deleteImage,
  getUploadConfig
} = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All upload routes require authentication
router.use(protect);

// Get upload configuration
router.get('/config', getUploadConfig);

// Profile image upload
router.post('/profile-picture', uploadProfilePicture);

// Trade screenshot upload  
router.post('/trade-screenshot', uploadTradeScreenshot);
router.post('/trade-screenshots', uploadTradeScreenshots);

// CSV upload
router.post('/csv', uploadCSV);

// Delete upload
router.delete('/image/:id', deleteImage);

module.exports = router;
