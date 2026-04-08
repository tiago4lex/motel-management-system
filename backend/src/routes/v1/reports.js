// backend/src/routes/v1/reports.js
const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/reportController');
const authMiddleware = require('../../middleware/authMiddleware');

// Aplicar autenticação em todas as rotas
router.use(authMiddleware.authenticate);

// Rotas
router.get('/dashboard', reportController.getDashboardMetrics);
router.get('/revenue', reportController.getRevenueReport);
router.get('/products', reportController.getProductsReport);
router.get('/occupancy', reportController.getOccupancyReport);
router.post('/export', reportController.exportReport);

module.exports = router;