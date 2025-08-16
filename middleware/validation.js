const { body, param, query } = require('express-validator');

// User validation rules
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, lowercase letter, number, and special character')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Country must be between 2 and 50 characters'),
  body('timezone')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Timezone must be between 3 and 50 characters')
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, lowercase letter, number, and special character')
];

// Trade validation rules
const validateCreateTrade = [
  body('symbol')
    .trim()
    .notEmpty()
    .withMessage('Symbol is required')
    .isLength({ min: 1, max: 20 })
    .withMessage('Symbol must be between 1 and 20 characters'),
  body('type')
    .isIn(['Long', 'Short'])
    .withMessage('Type must be either Long or Short'),
  body('quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number'),
  body('lotType')
    .optional()
    .isIn(['standard', 'mini', 'micro', 'nano'])
    .withMessage('Lot type must be standard, mini, micro, or nano'),
  body('entryPrice')
    .isFloat({ min: 0.00001 })
    .withMessage('Entry price must be a positive number (minimum 0.00001)'),
  body('exitPrice')
    .optional()
    .isFloat({ min: 0.00001 })
    .withMessage('Exit price must be a positive number (minimum 0.00001)'),
  body('pips')
    .optional()
    .isFloat()
    .withMessage('Pips must be a valid number'),
  body('returnPercent')
    .optional()
    .isFloat()
    .withMessage('Return percent must be a valid number'),
  body('entryDate')
    .optional()
    .isISO8601()
    .withMessage('Entry date must be a valid date'),
  body('entryTime')
    .optional()
    .isISO8601()
    .withMessage('Entry time must be a valid date'),
  body('exitDate')
    .optional()
    .isISO8601()
    .withMessage('Exit date must be a valid date'),
  body('exitTime')
    .optional()
    .isISO8601()
    .withMessage('Exit time must be a valid date'),
  body('stopLoss')
    .optional()
    .isFloat({ min: 0.00001 })
    .withMessage('Stop loss must be a positive number (minimum 0.00001)'),
  body('takeProfit')
    .optional()
    .isFloat({ min: 0.00001 })
    .withMessage('Take profit must be a positive number (minimum 0.00001)'),
  body('commission')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Commission must be a non-negative number'),
  body('strategy')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Strategy must not exceed 100 characters'),
  body('setup')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Setup must not exceed 100 characters'),
  body('timeframe')
    .optional()
    .isIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'])
    .withMessage('Invalid timeframe'),
  body('marketCondition')
    .optional()
    .isIn(['Trending', 'Ranging', 'Volatile', 'Calm'])
    .withMessage('Invalid market condition'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
  body('mood')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Mood must be between 1 and 5'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('status')
    .optional()
    .isIn(['open', 'closed', 'cancelled'])
    .withMessage('Status must be open, closed, or cancelled')
];

const validateUpdateTrade = [
  param('id')
    .isMongoId()
    .withMessage('Invalid trade ID'),
  ...validateCreateTrade.map(rule => rule.optional())
];

const validateTradeId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid trade ID')
];

// Query validation rules
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'entryDate', 'exitDate', 'symbol', 'profitLoss', 'type'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
];

const validateAnalyticsPeriod = [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y', 'all'])
    .withMessage('Period must be one of: 7d, 30d, 90d, 1y, all')
];

// Auth validation rules
const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, lowercase letter, number, and special character')
];

const validate2FAToken = [
  body('token')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('2FA token must be a 6-digit number')
];

const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

module.exports = {
  // User validations
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  
  // Trade validations
  validateCreateTrade,
  validateUpdateTrade,
  validateTradeId,
  
  // Query validations
  validatePagination,
  validateDateRange,
  validateAnalyticsPeriod,
  
  // Auth validations
  validateForgotPassword,
  validateResetPassword,
  validate2FAToken,
  validateRefreshToken
};
