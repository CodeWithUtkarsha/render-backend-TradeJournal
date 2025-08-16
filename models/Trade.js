const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  
  // Basic Trade Information
  symbol: {
    type: String,
    required: [true, 'Symbol is required'],
    uppercase: true,
    trim: true,
    maxlength: [20, 'Symbol cannot exceed 20 characters']
  },
  type: {
    type: String,
    required: [true, 'Trade type is required'],
    enum: {
      values: ['Long', 'Short'],
      message: 'Trade type must be either Long or Short'
    }
  },
  
  // Price Information
  entryPrice: {
    type: Number,
    required: [true, 'Entry price is required'],
    min: [0, 'Entry price must be positive']
  },
  exitPrice: {
    type: Number,
    default: null,
    min: [0, 'Exit price must be positive']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.001, 'Quantity must be positive']
  },
  
  // Forex-specific fields
  lotType: {
    type: String,
    enum: {
      values: ['standard', 'mini', 'micro', 'nano'],
      message: 'Lot type must be standard, mini, micro, or nano'
    },
    default: 'micro'
  },
  pips: {
    type: Number,
    default: null
  },
  returnPercent: {
    type: Number,
    default: null
  },
  
  // Risk Management
  stopLoss: {
    type: Number,
    default: null,
    min: [0, 'Stop loss must be positive']
  },
  takeProfit: {
    type: Number,
    default: null,
    min: [0, 'Take profit must be positive']
  },
  riskAmount: {
    type: Number,
    default: null,
    min: [0, 'Risk amount must be positive']
  },
  riskPercentage: {
    type: Number,
    default: null,
    min: [0, 'Risk percentage must be positive'],
    max: [100, 'Risk percentage cannot exceed 100%']
  },
  
  // Trade Outcome
  pnl: {
    type: Number,
    default: null
  },
  pnlPercentage: {
    type: Number,
    default: null
  },
  commission: {
    type: Number,
    default: 0,
    min: [0, 'Commission must be non-negative']
  },
  fees: {
    type: Number,
    default: 0,
    min: [0, 'Fees must be non-negative']
  },
  
  // Trade Status
  status: {
    type: String,
    enum: {
      values: ['Open', 'Closed', 'Cancelled'],
      message: 'Status must be Open, Closed, or Cancelled'
    },
    default: 'Open'
  },
  
  // Timing
  entryDate: {
    type: Date,
    default: Date.now,
    required: [true, 'Entry date is required']
  },
  exitDate: {
    type: Date,
    default: null
  },
  
  // Trading Psychology
  mood: {
    type: Number,
    min: [1, 'Mood must be between 1 and 5'],
    max: [5, 'Mood must be between 1 and 5'],
    default: 3
  },
  confidence: {
    type: Number,
    min: [1, 'Confidence must be between 1 and 5'],
    max: [5, 'Confidence must be between 1 and 5'],
    default: 3
  },
  
  // Trade Analysis
  setup: {
    type: String,
    trim: true,
    maxlength: [100, 'Setup description cannot exceed 100 characters']
  },
  strategy: {
    type: String,
    trim: true,
    maxlength: [100, 'Strategy description cannot exceed 100 characters']
  },
  timeframe: {
    type: String,
    enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'],
    default: '1h'
  },
  
  // Notes and Tags
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  
  // Market Conditions
  marketCondition: {
    type: String,
    enum: ['Trending', 'Ranging', 'Volatile', 'Quiet'],
    default: 'Trending'
  },
  marketSentiment: {
    type: String,
    enum: ['Bullish', 'Bearish', 'Neutral'],
    default: 'Neutral'
  },
  
  // Trade Images/Screenshots
  screenshots: [{
    url: String,
    description: String,
    type: {
      type: String,
      enum: ['Entry', 'Exit', 'Analysis', 'Other'],
      default: 'Other'
    }
  }],
  
  // Broker Information
  broker: {
    type: String,
    trim: true,
    maxlength: [50, 'Broker name cannot exceed 50 characters']
  },
  account: {
    type: String,
    trim: true,
    maxlength: [50, 'Account name cannot exceed 50 characters']
  },
  
  // Performance Metrics (calculated fields)
  holdingPeriod: {
    type: Number, // in hours
    default: null
  },
  riskRewardRatio: {
    type: Number,
    default: null
  },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
tradeSchema.index({ user: 1, createdAt: -1 });
tradeSchema.index({ user: 1, symbol: 1 });
tradeSchema.index({ user: 1, status: 1 });
tradeSchema.index({ user: 1, entryDate: -1 });
tradeSchema.index({ user: 1, pnl: -1 });

// Virtual for trade duration
tradeSchema.virtual('duration').get(function() {
  if (this.exitDate && this.entryDate) {
    return Math.round((this.exitDate - this.entryDate) / (1000 * 60 * 60)); // in hours
  }
  return null;
});

// Virtual for net P&L (including fees)
tradeSchema.virtual('netPnL').get(function() {
  if (this.pnl !== null) {
    return this.pnl - (this.commission || 0) - (this.fees || 0);
  }
  return null;
});

// Virtual for trade outcome
tradeSchema.virtual('outcome').get(function() {
  if (this.pnl === null) return 'Pending';
  if (this.pnl > 0) return 'Win';
  if (this.pnl < 0) return 'Loss';
  return 'Breakeven';
});

// Pre-save middleware to calculate P&L and other metrics
tradeSchema.pre('save', function(next) {
  // Calculate P&L if trade is closed OR if it's open but has exit price
  if ((this.status === 'Closed' || (this.status === 'Open' && this.exitPrice)) && 
      this.exitPrice && this.entryPrice && this.quantity) {
    if (this.type === 'Long') {
      this.pnl = (this.exitPrice - this.entryPrice) * this.quantity;
    } else {
      this.pnl = (this.entryPrice - this.exitPrice) * this.quantity;
    }
    
    // Calculate P&L percentage
    this.pnlPercentage = ((this.pnl || 0) / (this.entryPrice * this.quantity)) * 100;
    
    // Set exit date if not already set
    if (!this.exitDate) {
      this.exitDate = new Date();
    }
    
    // Calculate holding period
    if (this.entryDate && this.exitDate) {
      this.holdingPeriod = Math.round((this.exitDate - this.entryDate) / (1000 * 60 * 60));
    }
    
    // Calculate risk-reward ratio
    if (this.stopLoss && this.takeProfit) {
      const risk = Math.abs(this.entryPrice - this.stopLoss);
      const reward = Math.abs(this.takeProfit - this.entryPrice);
      this.riskRewardRatio = reward / risk;
    }
  }
  
  next();
});

// Static method to get trade statistics for a user
tradeSchema.statics.getTradeStats = async function(userId, timeframe = '30d') {
  const startDate = new Date();
  
  // Calculate start date based on timeframe
  switch (timeframe) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }
  
  const pipeline = [
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate },
        status: 'Closed'
      }
    },
    {
      $group: {
        _id: null,
        totalTrades: { $sum: 1 },
        totalPnL: { $sum: '$pnl' },
        totalCommission: { $sum: '$commission' },
        totalFees: { $sum: '$fees' },
        winningTrades: {
          $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] }
        },
        losingTrades: {
          $sum: { $cond: [{ $lt: ['$pnl', 0] }, 1, 0] }
        },
        avgWin: {
          $avg: { $cond: [{ $gt: ['$pnl', 0] }, '$pnl', null] }
        },
        avgLoss: {
          $avg: { $cond: [{ $lt: ['$pnl', 0] }, '$pnl', null] }
        },
        biggestWin: { $max: '$pnl' },
        biggestLoss: { $min: '$pnl' },
        avgHoldingPeriod: { $avg: '$holdingPeriod' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  
  if (result.length === 0) {
    return {
      totalTrades: 0,
      totalPnL: 0,
      winRate: 0,
      totalCommission: 0,
      totalFees: 0,
      netPnL: 0,
      avgTrade: 0,
      winningTrades: 0,
      losingTrades: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      biggestWin: 0,
      biggestLoss: 0,
      avgHoldingPeriod: 0
    };
  }
  
  const stats = result[0];
  const netPnL = stats.totalPnL - stats.totalCommission - stats.totalFees;
  const winRate = stats.totalTrades > 0 ? (stats.winningTrades / stats.totalTrades) * 100 : 0;
  const avgTrade = stats.totalTrades > 0 ? stats.totalPnL / stats.totalTrades : 0;
  const profitFactor = Math.abs(stats.avgLoss) > 0 ? stats.avgWin / Math.abs(stats.avgLoss) : 0;
  
  return {
    ...stats,
    netPnL,
    winRate,
    avgTrade,
    profitFactor
  };
};

module.exports = mongoose.model('Trade', tradeSchema);
