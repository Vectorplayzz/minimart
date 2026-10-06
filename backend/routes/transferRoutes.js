const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get all transfers - Admin and Manager only
router.get('/', roleMiddleware('admin', 'manager'), transferController.getAllTransfers);

// Get transfer stats - Admin and Manager only
router.get('/stats', roleMiddleware('admin', 'manager'), transferController.getTransferStats);

// Get single transfer
router.get('/:id', roleMiddleware('admin', 'manager'), transferController.getTransferById);

// Create transfer request - Admin and Manager
router.post('/', roleMiddleware('admin', 'manager'), transferController.createTransfer);

// Approve transfer - Admin and Manager
router.put('/:id/approve', roleMiddleware('admin', 'manager'), transferController.approveTransfer);

// Mark as in transit - Admin and Manager
router.put('/:id/in-transit', roleMiddleware('admin', 'manager'), transferController.markInTransit);

// Deliver transfer - Admin and Manager
router.put('/:id/deliver', roleMiddleware('admin', 'manager'), transferController.deliverTransfer);

// Cancel transfer - Admin and Manager
router.put('/:id/cancel', roleMiddleware('admin', 'manager'), transferController.cancelTransfer);

module.exports = router;