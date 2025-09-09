const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { loginLimiter } = require('../middlewares/rateLimitMiddleware');

// ❌ NÃO aplicar middleware de autenticação nas rotas de login!
// As rotas de login devem ser públicas

// Rota para registrar um novo colaborador (útil para testes)
// POST /api/auth/register
router.post('/register', authController.register);

// Rota para login do colaborador - COM RATE LIMITING
// POST /api/auth/login
router.post('/login', loginLimiter, authController.login);

// Rota para login de usuários administrativos (painel web) - COM RATE LIMITING
// POST /api/auth/login-admin
router.post('/login-admin', loginLimiter, authController.loginAdmin);

// Rota de emergência para criar usuário administrador - PROTEGIDA
// GET /api/auth/criar-admin-emergencia
const emergencyMiddleware = (req, res, next) => {
  const emergencyKey = req.headers['x-emergency-key'];
  const expectedKey = process.env.EMERGENCY_KEY || 'fg-services-emergency-2024';
  
  if (!emergencyKey || emergencyKey !== expectedKey) {
    const secureLogger = require('../../utils/secureLogger');
    secureLogger.security('critical', 'Tentativa de acesso não autorizado ao endpoint de emergência', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      providedKey: emergencyKey ? '[PROVIDED]' : '[MISSING]',
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      success: false,
      error: 'Chave de emergência inválida ou ausente',
      message: 'Este endpoint requer autorização especial. Entre em contato com o administrador do sistema.'
    });
  }
  
  next();
};

router.get('/criar-admin-emergencia', emergencyMiddleware, authController.criarAdminEmergencia);

// Rota temporária para corrigir constraint de perfil
// GET /api/auth/corrigir-constraint-perfil
router.get('/corrigir-constraint-perfil', authController.corrigirConstraintPerfil);

// Rota de teste para validar constraint
// GET /api/auth/testar-constraint
router.get('/testar-constraint', authController.testarConstraint);

// Endpoint de teste simples (sem autenticação)
router.get('/test', (req, res) => {
    console.log('🧪 TESTE: Endpoint de teste chamado');
    res.json({
        success: true,
        message: 'Endpoint de auth funcionando!',
        timestamp: new Date().toISOString()
    });
});

// Endpoint de teste para login (POST sem autenticação)
router.post('/test-login', (req, res) => {
    console.log('🧪 TESTE LOGIN: Body recebido:', req.body);
    res.json({
        success: true,
        message: 'POST funcionando!',
        body: req.body,
        timestamp: new Date().toISOString()
    });
});

module.exports = router; 