const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insightController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware('admin', 'manager'));

// Stock insights
router.get('/overstock', insightController.getOverstockItems);
router.get('/understock', insightController.getUnderstockItems);
router.get('/rebalance', insightController.getRebalanceSuggestions);

// Product velocity
router.get('/fast-moving', insightController.getFastMovingProducts);
router.get('/slow-moving', insightController.getSlowMovingProducts);

// Forecasting
router.get('/forecast/:productId/:branchId', insightController.getDemandForecast);
router.get('/days-until-stockout/:productId/:branchId', insightController.getDaysUntilStockout);

// Expiry
router.get('/expiry-risk', insightController.getExpiryRiskItems);

module.exports = router;