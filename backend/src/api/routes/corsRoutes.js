/**
 * Rotas para gerenciamento dinâmico de CORS
 * Permite administradores gerenciar origins permitidas
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middlewares/roleMiddleware');
const { getAllowedOrigins } = require('../middlewares/corsMiddleware');
const secureLogger = require('../../utils/secureLogger');

/**
 * Listar origins permitidas (ADMIN apenas)
 */
router.get('/origins', requireAdmin, (req, res) => {
  try {
    const allowedOrigins = getAllowedOrigins();
    
    secureLogger.audit('CORS Origins Listed', {
      admin: req.user?.email || 'unknown',
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      environment: process.env.NODE_ENV,
      allowedOrigins,
      count: allowedOrigins.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao listar origins CORS:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * Validar se uma origin específica é permitida (ADMIN apenas)
 */
router.post('/validate-origin', requireAdmin, (req, res) => {
  try {
    const { origin } = req.body;
    
    if (!origin) {
      return res.status(400).json({
        success: false,
        message: 'Origin é obrigatória'
      });
    }
    
    const allowedOrigins = getAllowedOrigins();
    const isAllowed = allowedOrigins.includes(origin);
    
    secureLogger.audit('CORS Origin Validation', {
      origin,
      isAllowed,
      admin: req.user?.email || 'unknown',
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      origin,
      isAllowed,
      message: isAllowed ? 'Origin permitida' : 'Origin não permitida',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao validar origin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * Obter estatísticas de requests CORS (ADMIN apenas)
 */
router.get('/stats', requireAdmin, (req, res) => {
  try {
    // Esta seria uma implementação mais complexa com cache/database
    // Por agora, retornamos informações básicas
    
    res.json({
      success: true,
      stats: {
        environment: process.env.NODE_ENV,
        corsEnabled: true,
        strictMode: process.env.NODE_ENV === 'production',
        allowedOriginsCount: getAllowedOrigins().length,
        securityLevel: 'MAXIMUM'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao obter stats CORS:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * Testar configuração CORS atual (ADMIN apenas)
 */
router.get('/test', requireAdmin, (req, res) => {
  try {
    const testOrigin = req.headers.origin;
    const allowedOrigins = getAllowedOrigins();
    
    const testResult = {
      currentOrigin: testOrigin || 'null',
      isCurrentOriginAllowed: testOrigin ? allowedOrigins.includes(testOrigin) : false,
      environment: process.env.NODE_ENV,
      allowedOrigins,
      corsHeaders: {
        'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin') || 'none',
        'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials') || 'none',
        'Access-Control-Allow-Methods': res.get('Access-Control-Allow-Methods') || 'none'
      }
    };
    
    secureLogger.audit('CORS Configuration Test', {
      testResult,
      admin: req.user?.email || 'unknown',
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      test: testResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao testar CORS:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
