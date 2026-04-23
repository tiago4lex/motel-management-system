const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/bookingController');
const authMiddleware = require('../../middleware/authMiddleware');

router.use(authMiddleware.authenticate);

router.get('/active', bookingController.getActiveBookings);
router.get('/products/search', bookingController.searchProduct);
router.get('/history', bookingController.getCheckoutHistory);
router.post('/', bookingController.createBooking);
router.patch('/:id/type', bookingController.changeBookingType);
router.patch('/rooms/:roomId/status', bookingController.changeRoomStatus);
router.post('/:id/consumption', bookingController.addConsumption);
router.delete('/:id/consumption/:itemId', bookingController.removeConsumption);
router.post('/:id/checkout', bookingController.checkout);
router.post('/:id/recalculate', bookingController.recalculateAmount);

module.exports = router;