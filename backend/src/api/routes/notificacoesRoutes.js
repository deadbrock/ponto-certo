const express = require('express');
const router = express.Router();
const notificacoesController = require('../../controllers/notificacoesController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * Rotas de Notificações
 * Endpoints para notificações automáticas baseadas nos dados dos totens
 * TODAS AS ROTAS REQUEREM AUTENTICAÇÃO
 */

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// GET /api/notificacoes/recentes
// Retorna notificações recentes baseadas em regras automáticas
router.get('/recentes', notificacoesController.obterNotificacoesRecentes);

// POST /api/notificacoes/marcar-lida
// Marca uma notificação como lida
router.post('/marcar-lida', notificacoesController.marcarNotificacaoLida);

// GET /api/notificacoes/configuracoes
// Retorna configurações do sistema de notificações
router.get('/configuracoes', notificacoesController.obterConfiguracoes);

module.exports = router; 