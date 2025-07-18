const express = require('express');
const router = express.Router();
const analyticsController = require('../../controllers/analyticsController');

/**
 * Rotas de Analytics
 * Endpoints para análises e gráficos baseados nos dados dos totems
 */

// GET /api/analytics/presenca-30-dias
// Retorna dados de presença dos últimos 30 dias para gráfico
router.get('/presenca-30-dias', analyticsController.obterPresenca30Dias);

// GET /api/analytics/tipos-batida
// Retorna distribuição por tipos de batida para gráfico pizza
router.get('/tipos-batida', analyticsController.obterTiposBatida);

// GET /api/analytics/ranking-colaboradores
// Retorna ranking dos top 5 colaboradores por pontualidade
router.get('/ranking-colaboradores', analyticsController.obterRankingColaboradores);

// GET /api/analytics/estatisticas-gerais
// Retorna estatísticas gerais para o painel de analytics
router.get('/estatisticas-gerais', analyticsController.obterEstatisticasGerais);

// GET /api/analytics/horas-trabalhadas
// Retorna dados de horas trabalhadas por colaborador
router.get('/horas-trabalhadas', analyticsController.obterHorasTrabalhadas);

module.exports = router; 