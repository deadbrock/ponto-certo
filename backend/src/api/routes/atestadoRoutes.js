const express = require('express');
const router = express.Router();
const atestadoController = require('../../controllers/atestadoController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

/**
 * Rotas de Atestados - CRUD Completo
 */

// GET /api/atestados - Listar atestados com filtros
router.get('/', atestadoController.listarAtestados);

// POST /api/atestados - Criar novo atestado
router.post('/', atestadoController.criarAtestado);

// PUT /api/atestados/:id/status - Atualizar status do atestado
router.put('/:id/status', atestadoController.atualizarStatusAtestado);

// GET /api/atestados/estatisticas - Estatísticas de atestados
router.get('/estatisticas', atestadoController.obterEstatisticasAtestados);

module.exports = router; 