const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/adminController');
const authMiddleware = require('../../middleware/authMiddleware');

// Todas as rotas de admin requerem autenticação e role ADMIN
router.use(authMiddleware.authenticate);
router.use(authMiddleware.authorize('ADMIN'));

// ==================== QUARTOS ====================
router.get('/rooms', adminController.getAllRooms);
router.post('/rooms', adminController.createRoom);
router.put('/rooms/:id', adminController.updateRoom);
router.delete('/rooms/:id', adminController.deleteRoom);

// ==================== TIPOS DE QUARTO ====================
router.get('/room-types', adminController.getAllRoomTypes);
router.post('/room-types', adminController.createRoomType);
router.put('/room-types/:id', adminController.updateRoomType);
router.delete('/room-types/:id', adminController.deleteRoomType);

// ==================== PRODUTOS ====================
router.get('/products', adminController.getAllProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.post('/products/:id/stock', adminController.adjustStock);

// ==================== USUÁRIOS ====================
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;