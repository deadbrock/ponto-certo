const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');

// ❌ NÃO aplicar middleware de autenticação nas rotas de login!
// As rotas de login devem ser públicas

// Rota para registrar um novo colaborador (útil para testes)
// POST /api/auth/register
router.post('/register', authController.register);

// Rota para login do colaborador
// POST /api/auth/login
router.post('/login', authController.login);

// Rota para login de usuários administrativos (painel web)
// POST /api/auth/login-admin
router.post('/login-admin', authController.loginAdmin);

// Rota de emergência para criar usuário administrador
// GET /api/auth/criar-admin-emergencia
router.get('/criar-admin-emergencia', authController.criarAdminEmergencia);

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