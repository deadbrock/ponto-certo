const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');

// Rota para registrar um novo colaborador (útil para testes)
// POST /api/auth/register
router.post('/register', authController.register);

// Rota para login do colaborador
// POST /api/auth/login
router.post('/login', authController.login);

module.exports = router; 