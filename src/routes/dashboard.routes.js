const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/stats', checkPermission('dashboard', 'canView'), dashboardController.getStats);
router.get('/analytics', checkPermission('dashboard', 'canView'), dashboardController.getAnalytics);

router.post('/financial-entry', checkPermission('dashboard', 'canUpdate'), dashboardController.addFinancialEntry);

module.exports = router;
