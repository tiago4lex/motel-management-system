const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const authMiddleware = require('../../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authMiddleware.authenticate, authController.logout);
router.get('/me', authMiddleware.authenticate, authController.getMe);

module.exports = router;