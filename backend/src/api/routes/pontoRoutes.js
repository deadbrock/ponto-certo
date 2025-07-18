const express = require('express');
const router = express.Router();
const pontoController = require('../../controllers/pontoController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rota pública para registrar ponto via reconhecimento facial
// POST /api/ponto/registrar-facial
router.post('/registrar-facial', pontoController.registrarPontoFacial);

// Rota pública para verificar próximo tipo de registro
// GET /api/ponto/proximo-tipo/:colaborador_id
router.get('/proximo-tipo/:colaborador_id', pontoController.verificarProximoTipo);

// Rota pública para listar registros (para painel web)
// GET /api/ponto/registros-public
router.get('/registros-public', pontoController.listarRegistrosPublic);

// Rota pública para histórico do tablet (para app totem)
// GET /api/ponto/historico-tablet-public/:tablet_id
router.get('/historico-tablet-public/:tablet_id', pontoController.obterHistoricoTabletPublic);

// Aplica o middleware de autenticação às demais rotas
router.use(authMiddleware);

// Rota para registrar um novo ponto (autenticada)
// POST /api/ponto/registrar
router.post('/registrar', pontoController.registrarPonto);

// Rota para listar os registros de ponto do colaborador logado
// GET /api/ponto/registros
router.get('/registros', pontoController.listarRegistros);

// GET /api/ponto/historico/:colaborador_id - Obter histórico de pontos de um colaborador
router.get('/historico/:colaborador_id', pontoController.obterHistorico);

// GET /api/ponto/historico-tablet/:tablet_id - Obter histórico de registros de um tablet específico
router.get('/historico-tablet/:tablet_id', pontoController.obterHistoricoTablet);

// GET /api/ponto/relatorio - Gerar relatório de pontos (admin)
router.get('/relatorio', pontoController.gerarRelatorio);

// GET /api/ponto/relatorio-afd
router.get('/relatorio-afd', pontoController.gerarRelatorioAFD);

// GET /api/ponto/relatorio-acjef
router.get('/relatorio-acjef', pontoController.gerarRelatorioACJEF);

// Rotas para estatísticas e validações avançadas
// GET /api/ponto/estatisticas/:colaborador_id
router.get('/estatisticas/:colaborador_id', pontoController.obterEstatisticasDia);

// POST /api/ponto/validar/:colaborador_id
router.post('/validar/:colaborador_id', pontoController.validarTipoRegistro);

// GET /api/ponto/dia-completo/:colaborador_id
router.get('/dia-completo/:colaborador_id', pontoController.obterRegistrosDiaCompleto);

// Rota para informações do turno do colaborador (autenticada)
// GET /api/ponto/turno
router.get('/turno', authMiddleware, pontoController.obterInfoTurno);

module.exports = router; 