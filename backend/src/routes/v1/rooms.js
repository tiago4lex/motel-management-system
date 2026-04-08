const express = require('express');
const router = express.Router();
const roomController = require('../../controllers/roomController');
const authMiddleware = require('../../middleware/authMiddleware');

// Todas as rotas de rooms requerem autenticação
router.use(authMiddleware.authenticate);

// Rotas GET
router.get('/', roomController.getAllRooms);
router.get('/available', roomController.getAllRooms);
router.get('/:id', roomController.getRoomById);

// Rotas POST, PUT, DELETE (admin apenas)
router.post('/', authMiddleware.authorize('ADMIN'), roomController.createRoom);
router.put('/:id', authMiddleware.authorize('ADMIN'), roomController.updateRoom);
router.patch('/:id/status', roomController.updateRoomStatus);
router.delete('/:id', authMiddleware.authorize('ADMIN'), roomController.deleteRoom);

module.exports = router;