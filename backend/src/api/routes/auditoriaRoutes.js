const express = require('express');
const router = express.Router();
const auditoriaController = require('../../controllers/auditoriaController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas as rotas de auditoria requerem autenticação
router.use(authMiddleware);

/**
 * @route POST /api/auditoria/logs
 * @desc Registrar log de auditoria
 * @access Private
 */
router.post('/logs', auditoriaController.registrarLog);

/**
 * @route GET /api/auditoria/logs
 * @desc Listar logs de auditoria
 * @access Private
 * @query {number} limite - Limite de registros (padrão: 50)
 * @query {number} offset - Offset para paginação (padrão: 0)
 * @query {string} usuario - Filtro por nome do usuário
 * @query {string} acao - Filtro por ação
 * @query {string} data_inicio - Data de início (YYYY-MM-DD)
 * @query {string} data_fim - Data de fim (YYYY-MM-DD)
 */
router.get('/logs', auditoriaController.listarLogs);

/**
 * @route POST /api/auditoria/correcoes
 * @desc Registrar correção de ponto
 * @access Private
 */
router.post('/correcoes', auditoriaController.registrarCorrecaoPonto);

/**
 * @route GET /api/auditoria/correcoes
 * @desc Listar correções de ponto
 * @access Private
 * @query {number} limite - Limite de registros (padrão: 50)
 * @query {number} offset - Offset para paginação (padrão: 0)
 * @query {string} colaborador - Filtro por nome do colaborador
 * @query {string} autor - Filtro por nome do autor
 * @query {string} data_inicio - Data de início (YYYY-MM-DD)
 * @query {string} data_fim - Data de fim (YYYY-MM-DD)
 */
router.get('/correcoes', auditoriaController.listarCorrecoes);

module.exports = router; 