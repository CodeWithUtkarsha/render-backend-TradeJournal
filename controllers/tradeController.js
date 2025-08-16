const Trade = require('../models/Trade');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const fs = require('fs');

// @desc    Get all trades for user
// @route   GET /api/trades
// @access  Private
const getTrades = async (req, res) => {
  try {
    console.log('🔍 getTrades called with query:', req.query);
    
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      symbol,
      type,
      status,
      strategy,
      startDate,
      endDate,
      period,
      minProfit,
      maxProfit
    } = req.query;

    // Build filter object
    const filter = { user: req.user.id };

    if (symbol) filter.symbol = new RegExp(symbol, 'i');
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (strategy) filter.strategy = new RegExp(strategy, 'i');

    // Handle period parameter
    if (period && !startDate && !endDate) {
      const now = new Date();
      let periodStartDate;
      
      switch(period) {
        case '1d':
          periodStartDate = new Date(now.getTime() - (24 * 60 * 60 * 1000));
          break;
        case '1w':
          periodStartDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
          break;
        case '1m':
          periodStartDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
          break;
        case '3m':
          periodStartDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
          break;
        case '6m':
          periodStartDate = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
          break;
        case '1y':
          periodStartDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
          break;
        default:
          // If period is not recognized, get all trades
          periodStartDate = null;
      }
      
      if (periodStartDate) {
        filter.entryDate = { $gte: periodStartDate };
        console.log('📅 Applied period filter:', period, 'from', periodStartDate);
      }
    } else if (startDate || endDate) {
      filter.entryDate = {};
      if (startDate) filter.entryDate.$gte = new Date(startDate);
      if (endDate) filter.entryDate.$lte = new Date(endDate);
    }

    console.log('🔍 Final filter:', JSON.stringify(filter, null, 2));

    if (minProfit !== undefined || maxProfit !== undefined) {
      filter.profitLoss = {};
      if (minProfit !== undefined) filter.profitLoss.$gte = parseFloat(minProfit);
      if (maxProfit !== undefined) filter.profitLoss.$lte = parseFloat(maxProfit);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const trades = await Trade.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count for pagination
    const total = await Trade.countDocuments(filter);
    
    console.log('📊 Found trades:', trades.length, 'Total in DB:', total);
    console.log('🔍 Trade IDs found:', trades.map(t => t._id));

    res.json({
      success: true,
      data: {
        trades,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTrades: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get single trade
// @route   GET /api/trades/:id
// @access  Private
const getTrade = async (req, res) => {
  try {
    const trade = await Trade.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found'
      });
    }

    res.json({
      success: true,
      data: trade
    });
  } catch (error) {
    console.error('Get trade error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Trade not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Create new trade
// @route   POST /api/trades
// @access  Private
const createTrade = async (req, res) => {
  try {
    console.log('🚀 createTrade called');
    console.log('📊 Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 User ID:', req.user.id);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const trade = new Trade({
      ...req.body,
      user: req.user.id
    });

    console.log('📝 Trade object before save:', JSON.stringify(trade, null, 2));
    await trade.save();
    console.log('✅ Trade saved successfully:', trade._id);

    // Update user trading stats
    await updateUserTradingStats(req.user.id);
    console.log('📈 User stats updated');

    res.status(201).json({
      success: true,
      message: 'Trade created successfully',
      data: trade
    });
    console.log('📤 Response sent successfully');
  } catch (error) {
    console.error('❌ Create trade error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update trade
// @route   PUT /api/trades/:id
// @access  Private
const updateTrade = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const trade = await Trade.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found'
      });
    }

    // Update trade fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        trade[key] = req.body[key];
      }
    });

    trade.updatedAt = new Date();
    await trade.save();

    // Update user trading stats
    await updateUserTradingStats(req.user.id);

    res.json({
      success: true,
      message: 'Trade updated successfully',
      data: trade
    });
  } catch (error) {
    console.error('Update trade error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Trade not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Delete trade
// @route   DELETE /api/trades/:id
// @access  Private
const deleteTrade = async (req, res) => {
  try {
    const trade = await Trade.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found'
      });
    }

    await Trade.findByIdAndDelete(req.params.id);

    // Update user trading stats
    await updateUserTradingStats(req.user.id);

    res.json({
      success: true,
      message: 'Trade deleted successfully'
    });
  } catch (error) {
    console.error('Delete trade error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Trade not found'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Bulk import trades
// @route   POST /api/trades/import
// @access  Private
const importTrades = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const trades = [];
    const errors = [];

    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        try {
          // Map CSV columns to trade schema
          const trade = {
            user: req.user.id,
            symbol: row.symbol || row.Symbol,
            type: row.type || row.Type,
            quantity: parseFloat(row.quantity || row.Quantity),
            entryPrice: parseFloat(row.entryPrice || row['Entry Price']),
            exitPrice: parseFloat(row.exitPrice || row['Exit Price']),
            entryDate: new Date(row.entryDate || row['Entry Date']),
            exitDate: row.exitDate || row['Exit Date'] ? new Date(row.exitDate || row['Exit Date']) : undefined,
            stopLoss: row.stopLoss || row['Stop Loss'] ? parseFloat(row.stopLoss || row['Stop Loss']) : undefined,
            takeProfit: row.takeProfit || row['Take Profit'] ? parseFloat(row.takeProfit || row['Take Profit']) : undefined,
            commission: row.commission || row.Commission ? parseFloat(row.commission || row.Commission) : 0,
            strategy: row.strategy || row.Strategy,
            notes: row.notes || row.Notes,
            status: row.status || row.Status || 'closed'
          };

          trades.push(trade);
        } catch (error) {
          errors.push({
            row: trades.length + 1,
            error: error.message
          });
        }
      })
      .on('end', async () => {
        try {
          // Validate and save trades
          const validTrades = [];
          for (const tradeData of trades) {
            try {
              const trade = new Trade(tradeData);
              await trade.save();
              validTrades.push(trade);
            } catch (error) {
              errors.push({
                row: validTrades.length + 1,
                error: error.message
              });
            }
          }

          // Update user trading stats
          if (validTrades.length > 0) {
            await updateUserTradingStats(req.user.id);
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            success: true,
            message: `Imported ${validTrades.length} trades successfully`,
            data: {
              imported: validTrades.length,
              errors: errors.length,
              errorDetails: errors
            }
          });
        } catch (error) {
          console.error('Import trades error:', error);
          res.status(500).json({
            success: false,
            error: 'Error processing import'
          });
        }
      });
  } catch (error) {
    console.error('Import trades error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Export trades to CSV
// @route   GET /api/trades/export
// @access  Private
const exportTrades = async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;

    // Build filter
    const filter = { user: req.user.id };
    if (startDate || endDate) {
      filter.entryDate = {};
      if (startDate) filter.entryDate.$gte = new Date(startDate);
      if (endDate) filter.entryDate.$lte = new Date(endDate);
    }

    const trades = await Trade.find(filter).sort({ entryDate: -1 });

    if (format === 'csv') {
      // Define CSV fields
      const fields = [
        'symbol',
        'type',
        'quantity',
        'entryPrice',
        'exitPrice',
        'entryDate',
        'exitDate',
        'stopLoss',
        'takeProfit',
        'profitLoss',
        'profitLossPercentage',
        'commission',
        'strategy',
        'setup',
        'timeframe',
        'marketCondition',
        'notes',
        'status'
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(trades);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=trades-export.csv');
      res.send(csv);
    } else {
      // JSON export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=trades-export.json');
      res.json({
        success: true,
        exportDate: new Date().toISOString(),
        totalTrades: trades.length,
        data: trades
      });
    }
  } catch (error) {
    console.error('Export trades error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Helper function to update user trading stats
const updateUserTradingStats = async (userId) => {
  try {
    const trades = await Trade.find({ user: userId });

    const stats = {
      totalTrades: trades.length,
      winningTrades: trades.filter(t => t.profitLoss > 0).length,
      losingTrades: trades.filter(t => t.profitLoss < 0).length,
      totalProfit: trades.reduce((sum, t) => sum + (t.profitLoss || 0), 0),
      totalCommission: trades.reduce((sum, t) => sum + (t.commission || 0), 0),
      averageWin: 0,
      averageLoss: 0,
      winRate: 0,
      largestWin: 0,
      largestLoss: 0
    };

    const winningTrades = trades.filter(t => t.profitLoss > 0);
    const losingTrades = trades.filter(t => t.profitLoss < 0);

    if (winningTrades.length > 0) {
      stats.averageWin = winningTrades.reduce((sum, t) => sum + t.profitLoss, 0) / winningTrades.length;
      stats.largestWin = Math.max(...winningTrades.map(t => t.profitLoss));
    }

    if (losingTrades.length > 0) {
      stats.averageLoss = losingTrades.reduce((sum, t) => sum + t.profitLoss, 0) / losingTrades.length;
      stats.largestLoss = Math.min(...losingTrades.map(t => t.profitLoss));
    }

    if (stats.totalTrades > 0) {
      stats.winRate = (stats.winningTrades / stats.totalTrades) * 100;
    }

    await User.findByIdAndUpdate(userId, {
      tradingStats: stats,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Update trading stats error:', error);
  }
};

module.exports = {
  getTrades,
  getTrade,
  createTrade,
  updateTrade,
  deleteTrade,
  importTrades,
  exportTrades
};
