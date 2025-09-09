const express = require('express');
const router = express.Router();
const consentimentoController = require('../../controllers/consentimentoController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * Rotas para gerenciamento de consentimentos LGPD
 * Todas as rotas requerem autenticação
 */

// Registrar consentimento para dados biométricos
// POST /api/consentimento/biometrico
router.post('/biometrico', consentimentoController.registrarConsentimentoBiometrico);

// Consultar consentimento de um colaborador
// GET /api/consentimento/colaborador/:id
router.get('/colaborador/:id', authMiddleware, consentimentoController.consultarConsentimento);

// Revogar consentimento (direito LGPD)
// POST /api/consentimento/revogar
router.post('/revogar', consentimentoController.revogarConsentimento);

// Listar consentimentos para auditoria (apenas admins)
// GET /api/consentimento/auditoria
router.get('/auditoria', authMiddleware, consentimentoController.listarConsentimentosAuditoria);

module.exports = router;
