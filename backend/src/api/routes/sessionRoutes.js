const express = require('express');
const router = express.Router();
const sessionManager = require('../../utils/sessionManager');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');

/**
 * 🕐 ROTAS DE CONTROLE DE SESSÃO
 * 
 * Endpoints para gerenciamento avançado de sessões
 */

/**
 * POST /api/session/logout
 * Logout manual com encerramento de sessão
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const sessionId = req.session?.session_id;
    
    if (sessionId) {
      await sessionManager.terminateSession(sessionId, 'manual_logout', req);
    }
    
    res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ LOGOUT ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao realizar logout'
    });
  }
});

/**
 * POST /api/session/renew
 * Renovação manual de token
 */
router.post('/renew', authMiddleware, async (req, res) => {
  try {
    const sessionId = req.session?.session_id;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Sessão não encontrada'
      });
    }
    
    const renewal = await sessionManager.renewToken(sessionId, req);
    
    res.status(200).json({
      success: true,
      message: 'Token renovado com sucesso',
      token: renewal.token,
      expiresAt: renewal.expiresAt
    });
    
  } catch (error) {
    console.error('❌ TOKEN RENEWAL ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao renovar token'
    });
  }
});

/**
 * GET /api/session/status
 * Verificar status da sessão atual
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const session = req.session;
    const user = req.user;
    
    const now = new Date();
    const timeToExpiry = session.expires_at.getTime() - now.getTime();
    const needsRenewal = sessionManager.needsRenewal(session);
    
    res.status(200).json({
      success: true,
      session: {
        id: session.session_id,
        active: session.active,
        expiresAt: session.expires_at,
        timeToExpiry: Math.max(0, timeToExpiry),
        needsRenewal,
        lastActivity: session.last_activity,
        actionsCount: session.actions_count || 0
      },
      user: {
        id: user.id,
        email: user.email,
        perfil: user.perfil
      }
    });
    
  } catch (error) {
    console.error('❌ SESSION STATUS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter status da sessão'
    });
  }
});

/**
 * GET /api/session/stats
 * Estatísticas de sessões (apenas admin)
 */
router.get('/stats', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const stats = await sessionManager.getSessionStats();
    
    res.status(200).json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ SESSION STATS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter estatísticas'
    });
  }
});

/**
 * POST /api/session/force-logout/:userId
 * Forçar logout de um usuário (apenas admin)
 */
router.post('/force-logout/:userId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason = 'admin_force_logout' } = req.body;
    
    const sessionsTerminated = await sessionManager.forceLogoutUser(parseInt(userId), reason);
    
    res.status(200).json({
      success: true,
      message: `${sessionsTerminated} sessões encerradas`,
      sessionsTerminated
    });
    
  } catch (error) {
    console.error('❌ FORCE LOGOUT ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao forçar logout'
    });
  }
});

/**
 * GET /api/session/active
 * Listar sessões ativas (apenas admin)
 */
router.get('/active', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const db = require('../../config/database');
    
    const result = await db.query(`
      SELECT 
        s.session_id,
        s.user_id,
        u.nome,
        u.email,
        s.start_time,
        s.last_activity,
        s.expires_at,
        s.login_ip,
        s.actions_count,
        EXTRACT(EPOCH FROM (s.expires_at - NOW())) as time_to_expiry
      FROM audit_sessions s
      JOIN usuarios u ON s.user_id = u.id
      WHERE s.active = true
      ORDER BY s.last_activity DESC
    `);
    
    res.status(200).json({
      success: true,
      activeSessions: result.rows
    });
    
  } catch (error) {
    console.error('❌ ACTIVE SESSIONS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar sessões ativas'
    });
  }
});

/**
 * POST /api/session/cleanup
 * Forçar limpeza de sessões expiradas (apenas admin)
 */
router.post('/cleanup', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await sessionManager.cleanupExpiredSessions();
    
    res.status(200).json({
      success: true,
      message: 'Limpeza de sessões executada'
    });
    
  } catch (error) {
    console.error('❌ SESSION CLEANUP ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Erro na limpeza de sessões'
    });
  }
});

/**
 * GET /api/session/config
 * Obter configurações de timeout (para o frontend)
 */
router.get('/config', (req, res) => {
  res.status(200).json({
    success: true,
    config: {
      timeout: sessionManager.defaultTimeout,
      renewalThreshold: sessionManager.renewalThreshold,
      maxSessions: sessionManager.maxSessions,
      timeoutMinutes: Math.floor(sessionManager.defaultTimeout / 60000),
      renewalMinutes: Math.floor(sessionManager.renewalThreshold / 60000)
    }
  });
});

module.exports = router;
