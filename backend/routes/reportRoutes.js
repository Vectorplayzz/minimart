const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware('admin', 'manager'));

router.get('/inventory', reportController.getInventoryReport);
router.get('/low-stock', reportController.getLowStockReport);
router.get('/expiry', reportController.getExpiryReport);
router.get('/transfers', reportController.getTransferReport);
router.get('/sales', reportController.getSalesReport);

module.exports = router;