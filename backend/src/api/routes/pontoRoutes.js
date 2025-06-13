const express = require('express');
const router = express.Router();
const pontoController = require('../../controllers/pontoController');
const authMiddleware = require('../middlewares/authMiddleware');

// Aplica o middleware de autenticação a todas as rotas deste arquivo
router.use(authMiddleware);

// Rota para registrar um novo ponto
// POST /api/ponto/registrar
router.post('/registrar', pontoController.registrarPonto);

// Rota para listar os registros de ponto do colaborador logado
// GET /api/ponto/registros
router.get('/registros', pontoController.listarRegistros);


module.exports = router; 