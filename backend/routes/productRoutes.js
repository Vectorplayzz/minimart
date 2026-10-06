const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, productController.getAllProducts);
router.get('/categories', authMiddleware, productController.getCategories);
router.get('/:id', authMiddleware, productController.getProductById);
router.post('/', authMiddleware, roleMiddleware('admin', 'manager'), productController.createProduct);
router.put('/:id', authMiddleware, roleMiddleware('admin', 'manager'), productController.updateProduct);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), productController.deleteProduct);

module.exports = router;