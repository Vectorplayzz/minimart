const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, salesController.getSales);
router.get('/history', authMiddleware, salesController.getSalesHistory);
router.get('/daily', authMiddleware, salesController.getDailySales);
router.get('/trend', authMiddleware, salesController.getSalesTrend);
router.get('/top', authMiddleware, salesController.getTopProducts);
router.get('/:productId/:branchId', authMiddleware, salesController.getSalesByProductBranch);
router.post('/', authMiddleware, salesController.createSale);

module.exports = router;