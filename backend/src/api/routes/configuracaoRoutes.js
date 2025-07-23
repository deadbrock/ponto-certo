const express = require('express');
const router = express.Router();
const configuracaoController = require('../../controllers/configuracaoController');
const authMiddleware = require('../middlewares/authMiddleware');

// Aplicar middleware de autenticação
router.use(authMiddleware);

/**
 * Rotas de Configurações
 * Endpoints para gerenciar configurações do sistema
 */

// === PARÂMETROS SINDICAIS ===
// POST /api/configuracoes/parametros-sindicais - Salvar parâmetros sindicais
router.post('/parametros-sindicais', configuracaoController.salvarParametrosSindicais);

// GET /api/configuracoes/parametros-sindicais - Obter parâmetros sindicais
router.get('/parametros-sindicais', configuracaoController.obterParametrosSindicais);

// === DISPOSITIVOS ===
// GET /api/configuracoes/dispositivos - Listar dispositivos conectados
router.get('/dispositivos', configuracaoController.listarDispositivos);

// === BACKUP ===
// POST /api/configuracoes/backup - Realizar backup
router.post('/backup', configuracaoController.realizarBackup);

// === CONFIGURAÇÕES GERAIS ===
// GET /api/configuracoes - Obter todas as configurações
router.get('/', configuracaoController.obterConfiguracaoGeral);

module.exports = router; 