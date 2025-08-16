const Trade = require('../models/Trade');
const User = require('../models/User');

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboardAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const userId = req.user.id;

    // Calculate date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3m':
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
      case '365d':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = null;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build filter
    const filter = { userId };
    if (startDate) {
      filter.entryDate = { $gte: startDate };
    }

    // Get trades for the period
    const trades = await Trade.find(filter);
    // Include both closed trades and open trades with exit prices (completed trades)
    const completedTrades = trades.filter(trade => 
      trade.status === 'Closed' || (trade.status === 'Open' && trade.exitPrice)
    );

    // Calculate basic metrics
    const totalTrades = completedTrades.length;
    const winningTrades = completedTrades.filter(trade => trade.pnl > 0);
    const losingTrades = completedTrades.filter(trade => trade.pnl < 0);
    
    const totalPnL = completedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const totalCommission = completedTrades.reduce((sum, trade) => sum + (trade.commission || 0), 0);
    const netPnL = totalPnL - totalCommission;

    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    
    const averageWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length 
      : 0;
    
    const averageLoss = losingTrades.length > 0 
      ? losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length 
      : 0;

    const profitFactor = Math.abs(averageLoss) > 0 ? averageWin / Math.abs(averageLoss) : 0;

    const largestWin = winningTrades.length > 0 
      ? Math.max(...winningTrades.map(trade => trade.pnl)) 
      : 0;
    
    const largestLoss = losingTrades.length > 0 
      ? Math.min(...losingTrades.map(trade => trade.pnl)) 
      : 0;

    // Calculate streaks
    let currentStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    const sortedTrades = completedTrades.sort((a, b) => new Date(a.exitDate) - new Date(b.exitDate));
    
    for (const trade of sortedTrades) {
      if (trade.pnl > 0) {
        tempWinStreak++;
        tempLossStreak = 0;
        currentStreak = tempWinStreak;
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
      } else if (trade.pnl < 0) {
        tempLossStreak++;
        tempWinStreak = 0;
        currentStreak = -tempLossStreak;
        longestLossStreak = Math.max(longestLossStreak, tempLossStreak);
      }
    }

    // Calculate portfolio value progression (assuming starting balance)
    const user = await User.findById(userId);
    const startingBalance = user?.settings?.riskManagement?.accountSize || 10000;
    
    let portfolioValue = startingBalance;
    const portfolioProgression = [{ date: startDate || new Date('2020-01-01'), value: startingBalance }];
    
    for (const trade of sortedTrades) {
      if (trade.exitDate) {
        portfolioValue += trade.pnl || 0;
        portfolioProgression.push({
          date: trade.exitDate,
          value: portfolioValue
        });
      }
    }

    const totalReturn = ((portfolioValue - startingBalance) / startingBalance) * 100;

    // Top performing symbols
    const symbolPerformance = {};
    completedTrades.forEach(trade => {
      if (!symbolPerformance[trade.symbol]) {
        symbolPerformance[trade.symbol] = {
          symbol: trade.symbol,
          trades: 0,
          totalPnL: 0,
          winRate: 0,
          wins: 0
        };
      }
      symbolPerformance[trade.symbol].trades++;
      symbolPerformance[trade.symbol].totalPnL += trade.pnl || 0;
      if (trade.pnl > 0) symbolPerformance[trade.symbol].wins++;
    });

    Object.values(symbolPerformance).forEach(symbol => {
      symbol.winRate = symbol.trades > 0 ? (symbol.wins / symbol.trades) * 100 : 0;
    });

    const topSymbols = Object.values(symbolPerformance)
      .sort((a, b) => b.totalPnL - a.totalPnL)
      .slice(0, 5);

    // Recent trades
    const recentTrades = completedTrades
      .sort((a, b) => new Date(b.exitDate || b.entryDate) - new Date(a.exitDate || a.entryDate))
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        summary: {
          totalTrades,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
          winRate: Math.round(winRate * 100) / 100,
          totalPnL: Math.round(totalPnL * 100) / 100,
          netPnL: Math.round(netPnL * 100) / 100,
          totalCommission: Math.round(totalCommission * 100) / 100,
          averageWin: Math.round(averageWin * 100) / 100,
          averageLoss: Math.round(averageLoss * 100) / 100,
          profitFactor: Math.round(profitFactor * 100) / 100,
          largestWin: Math.round(largestWin * 100) / 100,
          largestLoss: Math.round(largestLoss * 100) / 100,
          currentStreak,
          longestWinStreak,
          longestLossStreak,
          totalReturn: Math.round(totalReturn * 100) / 100,
          portfolioValue: Math.round(portfolioValue * 100) / 100
        },
        portfolioProgression,
        topSymbols,
        recentTrades,
        period
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get performance chart data
// @route   GET /api/analytics/performance
// @access  Private
const getPerformanceData = async (req, res) => {
  try {
    const { period = '30d', interval = 'daily' } = req.query;
    const userId = req.user.id;

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const trades = await Trade.find({
      user: userId,
      status: 'Closed',
      exitDate: { $gte: startDate, $lte: now }
    }).sort({ exitDate: 1 });

    // Group trades by interval
    const groupedData = {};
    const user = await User.findById(userId);
    const startingBalance = user?.settings?.riskManagement?.accountSize || 10000;
    let runningBalance = startingBalance;

    trades.forEach(trade => {
      const date = new Date(trade.exitDate);
      let groupKey;

      if (interval === 'daily') {
        groupKey = date.toISOString().split('T')[0];
      } else if (interval === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        groupKey = weekStart.toISOString().split('T')[0];
      } else if (interval === 'monthly') {
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          date: groupKey,
          trades: 0,
          pnl: 0,
          wins: 0,
          losses: 0,
          portfolioValue: runningBalance
        };
      }

      groupedData[groupKey].trades++;
      groupedData[groupKey].pnl += trade.profitLoss || 0;
      runningBalance += trade.profitLoss || 0;
      groupedData[groupKey].portfolioValue = runningBalance;

      if (trade.profitLoss > 0) {
        groupedData[groupKey].wins++;
      } else if (trade.profitLoss < 0) {
        groupedData[groupKey].losses++;
      }
    });

    const performanceData = Object.values(groupedData).map(data => ({
      ...data,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      pnl: Math.round(data.pnl * 100) / 100,
      portfolioValue: Math.round(data.portfolioValue * 100) / 100
    }));

    res.json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    console.error('Get performance data error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get win/loss analysis
// @route   GET /api/analytics/win-loss
// @access  Private
const getWinLossAnalysis = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const userId = req.user.id;

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const trades = await Trade.find({
      userId,
      status: 'closed',
      entryDate: { $gte: startDate }
    });

    // Analyze by different dimensions
    const analysis = {
      byTimeOfDay: {},
      byDayOfWeek: {},
      byMonth: {},
      byStrategy: {},
      bySetup: {},
      byTimeframe: {},
      byMarketCondition: {}
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    trades.forEach(trade => {
      const entryDate = new Date(trade.entryDate);
      const hour = entryDate.getHours();
      const dayOfWeek = dayNames[entryDate.getDay()];
      const month = monthNames[entryDate.getMonth()];

      // Time of day analysis (4-hour blocks)
      let timeBlock;
      if (hour >= 0 && hour < 6) timeBlock = '00:00-06:00';
      else if (hour >= 6 && hour < 12) timeBlock = '06:00-12:00';
      else if (hour >= 12 && hour < 18) timeBlock = '12:00-18:00';
      else timeBlock = '18:00-00:00';

      // Initialize structures
      [
        { key: 'byTimeOfDay', value: timeBlock },
        { key: 'byDayOfWeek', value: dayOfWeek },
        { key: 'byMonth', value: month },
        { key: 'byStrategy', value: trade.strategy || 'Unknown' },
        { key: 'bySetup', value: trade.setup || 'Unknown' },
        { key: 'byTimeframe', value: trade.timeframe || 'Unknown' },
        { key: 'byMarketCondition', value: trade.marketCondition || 'Unknown' }
      ].forEach(({ key, value }) => {
        if (!analysis[key][value]) {
          analysis[key][value] = {
            name: value,
            trades: 0,
            wins: 0,
            losses: 0,
            totalPnL: 0,
            winRate: 0,
            averagePnL: 0
          };
        }

        analysis[key][value].trades++;
        analysis[key][value].totalPnL += trade.profitLoss || 0;

        if (trade.profitLoss > 0) {
          analysis[key][value].wins++;
        } else if (trade.profitLoss < 0) {
          analysis[key][value].losses++;
        }
      });
    });

    // Calculate rates and averages
    Object.keys(analysis).forEach(categoryKey => {
      Object.keys(analysis[categoryKey]).forEach(itemKey => {
        const item = analysis[categoryKey][itemKey];
        item.winRate = item.trades > 0 ? (item.wins / item.trades) * 100 : 0;
        item.averagePnL = item.trades > 0 ? item.totalPnL / item.trades : 0;
        item.winRate = Math.round(item.winRate * 100) / 100;
        item.averagePnL = Math.round(item.averagePnL * 100) / 100;
        item.totalPnL = Math.round(item.totalPnL * 100) / 100;
      });

      // Convert to arrays and sort by performance
      analysis[categoryKey] = Object.values(analysis[categoryKey])
        .sort((a, b) => b.totalPnL - a.totalPnL);
    });

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Get win/loss analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get symbol performance
// @route   GET /api/analytics/symbols
// @access  Private
const getSymbolPerformance = async (req, res) => {
  try {
    const { period = '30d', limit = 10 } = req.query;
    const userId = req.user.id;

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const trades = await Trade.find({
      userId,
      status: 'closed',
      entryDate: { $gte: startDate }
    });

    const symbolStats = {};

    trades.forEach(trade => {
      const symbol = trade.symbol;
      
      if (!symbolStats[symbol]) {
        symbolStats[symbol] = {
          symbol,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          totalPnL: 0,
          totalVolume: 0,
          winRate: 0,
          averagePnL: 0,
          bestTrade: 0,
          worstTrade: 0,
          averageHoldTime: 0,
          holdTimes: []
        };
      }

      const stats = symbolStats[symbol];
      stats.totalTrades++;
      stats.totalPnL += trade.profitLoss || 0;
      stats.totalVolume += (trade.quantity || 0) * (trade.entryPrice || 0);

      if (trade.profitLoss > 0) {
        stats.wins++;
        stats.bestTrade = Math.max(stats.bestTrade, trade.profitLoss);
      } else if (trade.profitLoss < 0) {
        stats.losses++;
        stats.worstTrade = Math.min(stats.worstTrade, trade.profitLoss);
      }

      // Calculate hold time if both dates exist
      if (trade.entryDate && trade.exitDate) {
        const holdTime = (new Date(trade.exitDate) - new Date(trade.entryDate)) / (1000 * 60 * 60 * 24); // days
        stats.holdTimes.push(holdTime);
      }
    });

    // Calculate final metrics
    const symbolPerformance = Object.values(symbolStats).map(stats => {
      stats.winRate = stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;
      stats.averagePnL = stats.totalTrades > 0 ? stats.totalPnL / stats.totalTrades : 0;
      stats.averageHoldTime = stats.holdTimes.length > 0 
        ? stats.holdTimes.reduce((sum, time) => sum + time, 0) / stats.holdTimes.length 
        : 0;

      // Round values
      stats.winRate = Math.round(stats.winRate * 100) / 100;
      stats.averagePnL = Math.round(stats.averagePnL * 100) / 100;
      stats.totalPnL = Math.round(stats.totalPnL * 100) / 100;
      stats.totalVolume = Math.round(stats.totalVolume * 100) / 100;
      stats.averageHoldTime = Math.round(stats.averageHoldTime * 100) / 100;
      stats.bestTrade = Math.round(stats.bestTrade * 100) / 100;
      stats.worstTrade = Math.round(stats.worstTrade * 100) / 100;

      delete stats.holdTimes; // Remove intermediate data
      return stats;
    });

    // Sort by total P&L and limit results
    symbolPerformance.sort((a, b) => b.totalPnL - a.totalPnL);
    const limitedResults = symbolPerformance.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limitedResults
    });
  } catch (error) {
    console.error('Get symbol performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get risk analysis
// @route   GET /api/analytics/risk
// @access  Private
const getRiskAnalysis = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const userId = req.user.id;

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const trades = await Trade.find({
      userId,
      status: 'closed',
      entryDate: { $gte: startDate }
    }).sort({ exitDate: 1 });

    const user = await User.findById(userId);
    const accountSize = user?.settings?.riskManagement?.accountSize || 10000;
    
    // Calculate drawdown
    let peak = accountSize;
    let currentValue = accountSize;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    const drawdownHistory = [];

    trades.forEach(trade => {
      currentValue += trade.profitLoss || 0;
      
      if (currentValue > peak) {
        peak = currentValue;
      }
      
      const drawdown = peak - currentValue;
      const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
      
      maxDrawdown = Math.max(maxDrawdown, drawdown);
      maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdownPercent);
      
      drawdownHistory.push({
        date: trade.exitDate,
        value: currentValue,
        peak,
        drawdown,
        drawdownPercent
      });
    });

    // Risk per trade analysis
    const riskPerTrade = trades.map(trade => {
      const riskAmount = trade.entryPrice && trade.stopLoss && trade.quantity
        ? Math.abs((trade.entryPrice - trade.stopLoss) * trade.quantity)
        : 0;
      const riskPercent = riskAmount > 0 ? (riskAmount / accountSize) * 100 : 0;
      
      return {
        symbol: trade.symbol,
        date: trade.entryDate,
        riskAmount: Math.round(riskAmount * 100) / 100,
        riskPercent: Math.round(riskPercent * 100) / 100,
        actualPnL: trade.profitLoss || 0
      };
    });

    // Risk distribution
    const riskBuckets = {
      'Low (0-1%)': 0,
      'Medium (1-2%)': 0,
      'High (2-3%)': 0,
      'Very High (>3%)': 0
    };

    riskPerTrade.forEach(trade => {
      if (trade.riskPercent <= 1) riskBuckets['Low (0-1%)']++;
      else if (trade.riskPercent <= 2) riskBuckets['Medium (1-2%)']++;
      else if (trade.riskPercent <= 3) riskBuckets['High (2-3%)']++;
      else riskBuckets['Very High (>3%)']++;
    });

    // Calculate risk metrics
    const averageRisk = riskPerTrade.length > 0
      ? riskPerTrade.reduce((sum, trade) => sum + trade.riskPercent, 0) / riskPerTrade.length
      : 0;

    const maxRisk = riskPerTrade.length > 0
      ? Math.max(...riskPerTrade.map(trade => trade.riskPercent))
      : 0;

    // Risk-adjusted returns
    const totalReturn = ((currentValue - accountSize) / accountSize) * 100;
    const sharpeRatio = maxDrawdownPercent > 0 ? totalReturn / maxDrawdownPercent : 0;

    res.json({
      success: true,
      data: {
        summary: {
          maxDrawdown: Math.round(maxDrawdown * 100) / 100,
          maxDrawdownPercent: Math.round(maxDrawdownPercent * 100) / 100,
          currentValue: Math.round(currentValue * 100) / 100,
          totalReturn: Math.round(totalReturn * 100) / 100,
          averageRisk: Math.round(averageRisk * 100) / 100,
          maxRisk: Math.round(maxRisk * 100) / 100,
          sharpeRatio: Math.round(sharpeRatio * 100) / 100
        },
        drawdownHistory,
        riskPerTrade,
        riskDistribution: Object.entries(riskBuckets).map(([range, count]) => ({
          range,
          count,
          percentage: trades.length > 0 ? Math.round((count / trades.length) * 100 * 100) / 100 : 0
        }))
      }
    });
  } catch (error) {
    console.error('Get risk analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

module.exports = {
  getDashboardAnalytics,
  getPerformanceData,
  getWinLossAnalysis,
  getSymbolPerformance,
  getRiskAnalysis
};
