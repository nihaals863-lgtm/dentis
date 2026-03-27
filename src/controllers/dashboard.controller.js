const dashboardService = require('../services/dashboard.service');

const getStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getAdminStats(req.user);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const { branch } = req.query;
    const analytics = await dashboardService.getFinancialAnalytics(branch);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
};

const addFinancialEntry = async (req, res, next) => {
  try {
    const entry = await dashboardService.createMonthlyFinancial(req.body);
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getAnalytics,
  addFinancialEntry
};
