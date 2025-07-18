const express = require('express');
const router = express.Router();
const escalaController = require('../../controllers/escalaController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Rotas para escalas
router.get('/', escalaController.listarEscalas);
router.post('/', escalaController.cadastrarEscala);
router.put('/:id', escalaController.editarEscala);
router.delete('/:id', escalaController.excluirEscala);

module.exports = router; 