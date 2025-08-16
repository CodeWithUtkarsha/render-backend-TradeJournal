const express = require('express');
const {
  getDashboardAnalytics,
  getPerformanceData,
  getWinLossAnalysis,
  getSymbolPerformance,
  getRiskAnalysis
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes
router.get('/dashboard', getDashboardAnalytics);
router.get('/performance', getPerformanceData);
router.get('/win-loss', getWinLossAnalysis);
router.get('/symbols', getSymbolPerformance);
router.get('/risk', getRiskAnalysis);

module.exports = router;
