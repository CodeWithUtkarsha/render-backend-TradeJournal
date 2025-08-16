const express = require('express');
const { body } = require('express-validator');
const {
  getTrades,
  getTrade,
  createTrade,
  updateTrade,
  deleteTrade,
  importTrades,
  exportTrades
} = require('../controllers/tradeController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Validation rules
const tradeValidation = [
  body('symbol')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Symbol is required and must be less than 20 characters'),
  body('type')
    .isIn(['Long', 'Short'])
    .withMessage('Trade type must be either Long or Short'),
  body('entryPrice')
    .isFloat({ min: 0 })
    .withMessage('Entry price must be a positive number'),
  body('quantity')
    .isFloat({ min: 0.001 })
    .withMessage('Quantity must be a positive number'),
  body('exitPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Exit price must be a positive number'),
  body('stopLoss')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Stop loss must be a positive number'),
  body('takeProfit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Take profit must be a positive number'),
  body('mood')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Mood must be between 1 and 5'),
  body('confidence')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Confidence must be between 1 and 5'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Routes
router.get('/', getTrades);
router.get('/:id', getTrade);
router.post('/', tradeValidation, createTrade);
router.put('/:id', tradeValidation, updateTrade);
router.delete('/:id', deleteTrade);
router.post('/import', importTrades);
router.get('/export', exportTrades);

module.exports = router;
