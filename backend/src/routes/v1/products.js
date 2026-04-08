const express = require('express');
const router = express.Router();
const productController = require('../../controllers/productController');
const authMiddleware = require('../../middleware/authMiddleware');

router.use(authMiddleware.authenticate);

router.get('/', productController.getAllProducts);
router.get('/low-stock', productController.getLowStockProducts);
router.get('/:id', productController.getProductById);
router.post('/', authMiddleware.authorize('ADMIN'), productController.createProduct);
router.put('/:id', authMiddleware.authorize('ADMIN'), productController.updateProduct);
router.post('/:id/stock', authMiddleware.authorize('ADMIN'), productController.updateStock);
router.delete('/:id', authMiddleware.authorize('ADMIN'), productController.deleteProduct);

module.exports = router;