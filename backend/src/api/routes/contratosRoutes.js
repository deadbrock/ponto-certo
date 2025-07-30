const express = require('express');
const router = express.Router();
const contratosController = require('../../controllers/contratosController');

/**
 * Rotas de Contratos - CRUD Completo
 * Sistema real de gestão de contratos conectado ao PostgreSQL
 */

// POST /api/contratos - Criar novo contrato
router.post('/', contratosController.criarContrato);

// GET /api/contratos/estados
// Retorna dados de contratos por estado para o mapa de atuação
router.get('/estados', contratosController.obterDadosEstados);

// GET /api/contratos/mapa-atuacao
// Endpoint específico para o mapa de atuação com formato esperado pelo frontend
router.get('/mapa-atuacao', contratosController.obterDadosMapaAtuacao);

// GET /api/contratos/estatisticas
// Retorna estatísticas gerais de contratos para o mapa
router.get('/estatisticas', contratosController.obterEstatisticasContratos);

// GET /api/contratos/dashboard
// Retorna dashboard de contratos com KPIs e distribuições
router.get('/dashboard', contratosController.obterDashboardContratos);

// GET /api/contratos/:id/kpis
// Retorna KPIs específicos de um contrato
router.get('/:id/kpis', contratosController.obterKPIsContrato);

// PUT /api/contratos/:id - Atualizar contrato
router.put('/:id', contratosController.atualizarContrato);

// DELETE /api/contratos/:id - Excluir contrato
router.delete('/:id', contratosController.excluirContrato);

// GET /api/contratos/:id - Obter contrato específico
router.get('/:id', contratosController.obterContratoPorId);

// GET /api/contratos - Listar todos os contratos com filtros opcionais
router.get('/', contratosController.listarContratos);

module.exports = router; 