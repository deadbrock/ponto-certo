const express = require('express');
const router = express.Router();
const escalaController = require('../../controllers/escalaController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

/**
 * Rotas de Escalas e Feriados - CRUD Completo
 */

// === ESCALAS ===
// GET /api/escalas - Listar escalas
router.get('/', escalaController.listarEscalas);

// POST /api/escalas - Criar nova escala
router.post('/', escalaController.cadastrarEscala);

// PUT /api/escalas/:id - Editar escala
router.put('/:id', escalaController.editarEscala);

// DELETE /api/escalas/:id - Excluir escala
router.delete('/:id', escalaController.excluirEscala);

// === FERIADOS ===
// GET /api/escalas/feriados - Listar feriados
router.get('/feriados', escalaController.listarFeriados);

// POST /api/escalas/feriados - Criar novo feriado
router.post('/feriados', escalaController.cadastrarFeriado);

module.exports = router; 