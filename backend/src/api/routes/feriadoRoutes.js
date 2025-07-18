const express = require('express');
const router = express.Router();
const escalaController = require('../../controllers/escalaController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Rotas para feriados
router.get('/', escalaController.listarFeriados);
router.post('/', escalaController.cadastrarFeriado);

module.exports = router; 