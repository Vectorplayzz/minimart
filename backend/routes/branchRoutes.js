const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, branchController.getAllBranches);
router.get('/:id', authMiddleware, branchController.getBranchById);
router.get('/:id/inventory', authMiddleware, branchController.getBranchInventory);
router.post('/', authMiddleware, roleMiddleware('admin', 'manager'), branchController.createBranch);
router.put('/:id', authMiddleware, roleMiddleware('admin', 'manager'), branchController.updateBranch);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), branchController.deleteBranch);

module.exports = router;