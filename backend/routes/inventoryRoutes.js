const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, inventoryController.getAllInventory);
router.get('/summary', authMiddleware, inventoryController.getInventorySummary);
router.get('/branch/:branchId', authMiddleware, inventoryController.getInventoryByBranch);
router.post('/', authMiddleware, roleMiddleware('admin', 'manager'), inventoryController.createOrUpdateInventory);
router.put('/:id', authMiddleware, roleMiddleware('admin', 'manager', 'staff'), inventoryController.setInventoryQuantity);
router.post('/transfer', authMiddleware, roleMiddleware('admin', 'manager'), inventoryController.transferStock);

module.exports = router;