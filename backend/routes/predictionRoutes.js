const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.get('/all', authMiddleware, predictionController.getAllPredictions);
router.get('/recommendations/:productId', authMiddleware, predictionController.getRecommendations);
router.get('/:productId/:branchId', authMiddleware, predictionController.getPrediction);
router.post('/train', authMiddleware, roleMiddleware('admin'), predictionController.trainModel);

module.exports = router;