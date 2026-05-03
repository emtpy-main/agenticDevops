const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController')

// Placeholder for auth routes
router.post('/verify-token', authController.verifyToken);

module.exports = router;
