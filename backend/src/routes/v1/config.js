const express = require('express');
const router = express.Router();
const configController = require('../../controllers/configController');
const authMiddleware = require('../../middleware/authMiddleware');

router.use(authMiddleware.authenticate);

router.get('/system', configController.getSystemConfig);
router.put('/system', authMiddleware.authorize('ADMIN'), configController.updateSystemConfig);
router.get('/room-types', configController.getRoomTypes);
router.post('/room-types', authMiddleware.authorize('ADMIN'), configController.createRoomType);
router.put('/room-types/:id', authMiddleware.authorize('ADMIN'), configController.updateRoomType);
router.get('/pricing', configController.getPricingConfig);
router.put('/pricing', authMiddleware.authorize('ADMIN'), configController.updatePricingConfig);

module.exports = router;