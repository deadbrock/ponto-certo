const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/dashboardController');

/**
 * Rotas do Dashboard
 * Endpoints para estatísticas e dados em tempo real dos totems
 */

// GET /api/dashboard/estatisticas
// Retorna estatísticas gerais do sistema
router.get('/estatisticas', dashboardController.obterEstatisticas);

// GET /api/dashboard/registros-recentes  
// Retorna os 10 registros de ponto mais recentes
router.get('/registros-recentes', dashboardController.obterRegistrosRecentes);

// GET /api/dashboard/alertas
// Retorna alertas automáticos baseados nos dados dos totems
router.get('/alertas', dashboardController.obterAlertas);

// GET /api/dashboard/progresso-mensal
// Retorna dados de progresso mensal para gráficos
router.get('/progresso-mensal', dashboardController.obterProgressoMensal);

module.exports = router; 