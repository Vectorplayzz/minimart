const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, alertController.getAllAlerts);
router.get('/summary', authMiddleware, alertController.getAlertSummary);
router.get('/low-stock', authMiddleware, alertController.getLowStockAlerts);
router.get('/overstock', authMiddleware, alertController.getOverstockAlerts);
router.get('/expiry', authMiddleware, alertController.getExpiryAlerts);

module.exports = router;