const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Routes
router.get('/', userController.login);
router.post('/users', userController.createUser);

module.exports = router;