const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/bookingController');
const authMiddleware = require('../../middleware/authMiddleware');

router.use(authMiddleware.authenticate);

router.get('/active', bookingController.getActiveBookings);
router.get('/history', bookingController.getCheckoutHistory);
router.get('/products/search', bookingController.searchProduct);
router.get('/:id', bookingController.getBookingById);
router.post('/', bookingController.createBooking);
router.patch('/:id/type', bookingController.changeBookingType);
router.patch('/rooms/:roomId/status', bookingController.changeRoomStatus);
router.post('/:id/consumption', bookingController.addConsumption);
router.delete('/:id/consumption/:itemId', bookingController.removeConsumption);
router.post('/:id/start-checkout', bookingController.startCheckout);
router.post('/:id/confirm-checkout', bookingController.confirmCheckout);

module.exports = router;