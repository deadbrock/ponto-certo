const express = require('express');
const router = express.Router();
const frequenciaController = require('../../controllers/frequenciaController');
const authMiddleware = require('../middlewares/authMiddleware');

// Aplicar middleware de autenticação
router.use(authMiddleware);

/**
 * Rotas de Frequência
 * Endpoints para relatórios de frequência baseados nos registros de ponto
 */

// GET /api/frequencia/resumo-mensal - Resumo mensal de todos os colaboradores
router.get('/resumo-mensal', frequenciaController.obterResumoMensal);

// GET /api/frequencia/estatisticas - Estatísticas gerais de frequência
router.get('/estatisticas', frequenciaController.obterEstatisticasFrequencia);

// GET /api/frequencia/detalhes/:colaborador_id - Detalhes de frequência de um colaborador
router.get('/detalhes/:colaborador_id', frequenciaController.obterDetalhesColaborador);

module.exports = router; 