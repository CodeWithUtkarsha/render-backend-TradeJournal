const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Cloudinary storage configuration for profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tradejournal/profile-pictures',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  },
});

// Cloudinary storage configuration for trade screenshots
const tradeStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tradejournal/trade-screenshots',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1200, height: 800, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  },
});

// Local storage fallback (for development or when Cloudinary is not configured)
const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// File filter for CSV
const csvFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

// Configure multer for different upload types
const profileUpload = multer({
  storage: process.env.CLOUDINARY_CLOUD_NAME ? profileStorage : localStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

const tradeUpload = multer({
  storage: process.env.CLOUDINARY_CLOUD_NAME ? tradeStorage : localStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

const csvUpload = multer({
  storage: localStorage, // Always use local storage for CSV processing
  fileFilter: csvFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for large CSV files
  }
});

// @desc    Upload profile picture
// @route   POST /api/upload/profile-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    profileUpload.single('profilePicture')(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: 'File size too large. Maximum size is 5MB.'
            });
          }
        }
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      let imageUrl;
      let publicId;

      if (process.env.CLOUDINARY_CLOUD_NAME) {
        // Cloudinary upload
        imageUrl = req.file.path;
        publicId = req.file.filename;
      } else {
        // Local upload fallback
        imageUrl = `/uploads/${req.file.filename}`;
        publicId = req.file.filename;
      }

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          url: imageUrl,
          publicId: publicId,
          originalName: req.file.originalname,
          size: req.file.size
        }
      });
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Upload trade screenshot
// @route   POST /api/upload/trade-screenshot
// @access  Private
const uploadTradeScreenshot = async (req, res) => {
  try {
    tradeUpload.single('screenshot')(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: 'File size too large. Maximum size is 10MB.'
            });
          }
        }
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      let imageUrl;
      let publicId;

      if (process.env.CLOUDINARY_CLOUD_NAME) {
        // Cloudinary upload
        imageUrl = req.file.path;
        publicId = req.file.filename;
      } else {
        // Local upload fallback
        imageUrl = `/uploads/${req.file.filename}`;
        publicId = req.file.filename;
      }

      res.json({
        success: true,
        message: 'Trade screenshot uploaded successfully',
        data: {
          url: imageUrl,
          publicId: publicId,
          originalName: req.file.originalname,
          size: req.file.size
        }
      });
    });
  } catch (error) {
    console.error('Upload trade screenshot error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Upload multiple trade screenshots
// @route   POST /api/upload/trade-screenshots
// @access  Private
const uploadTradeScreenshots = async (req, res) => {
  try {
    tradeUpload.array('screenshots', 5)(req, res, async (err) => { // Max 5 files
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: 'One or more files are too large. Maximum size is 10MB per file.'
            });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              error: 'Too many files. Maximum 5 files allowed.'
            });
          }
        }
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded'
        });
      }

      const uploadedFiles = req.files.map(file => {
        let imageUrl;
        let publicId;

        if (process.env.CLOUDINARY_CLOUD_NAME) {
          // Cloudinary upload
          imageUrl = file.path;
          publicId = file.filename;
        } else {
          // Local upload fallback
          imageUrl = `/uploads/${file.filename}`;
          publicId = file.filename;
        }

        return {
          url: imageUrl,
          publicId: publicId,
          originalName: file.originalname,
          size: file.size
        };
      });

      res.json({
        success: true,
        message: `${uploadedFiles.length} screenshots uploaded successfully`,
        data: uploadedFiles
      });
    });
  } catch (error) {
    console.error('Upload trade screenshots error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Upload CSV file for trade import
// @route   POST /api/upload/csv
// @access  Private
const uploadCSV = async (req, res) => {
  try {
    csvUpload.single('csvFile')(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: 'File size too large. Maximum size is 50MB.'
            });
          }
        }
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No CSV file uploaded'
        });
      }

      res.json({
        success: true,
        message: 'CSV file uploaded successfully',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          size: req.file.size
        }
      });
    });
  } catch (error) {
    console.error('Upload CSV error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Delete image from Cloudinary
// @route   DELETE /api/upload/image/:publicId
// @access  Private
const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'Public ID is required'
      });
    }

    if (process.env.CLOUDINARY_CLOUD_NAME) {
      // Delete from Cloudinary
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        res.json({
          success: true,
          message: 'Image deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Image not found or already deleted'
        });
      }
    } else {
      // Delete from local storage
      const fs = require('fs');
      const filePath = path.join(__dirname, '../uploads', publicId);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({
          success: true,
          message: 'Image deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        });
      }
    }
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get upload configuration/limits
// @route   GET /api/upload/config
// @access  Private
const getUploadConfig = async (req, res) => {
  try {
    const config = {
      profilePicture: {
        maxSize: '5MB',
        allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        maxFiles: 1
      },
      tradeScreenshots: {
        maxSize: '10MB',
        allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        maxFiles: 5
      },
      csvImport: {
        maxSize: '50MB',
        allowedFormats: ['csv'],
        maxFiles: 1
      },
      cloudinaryEnabled: !!process.env.CLOUDINARY_CLOUD_NAME
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get upload config error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

module.exports = {
  uploadProfilePicture,
  uploadTradeScreenshot,
  uploadTradeScreenshots,
  uploadCSV,
  deleteImage,
  getUploadConfig
};
