const jwt = require('jsonwebtoken');
const db = require('../config/database');
const auditLogger = require('./auditLogger');

/**
 * 🕐 GERENCIADOR DE SESSÕES AVANÇADO
 * 
 * Sistema completo de controle de sessões com timeout, renovação automática
 * e auditoria completa para compliance de segurança
 */

class SessionManager {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'ponto-digital-jwt-secret-key-2024';
    this.defaultTimeout = 30 * 60 * 1000; // 30 minutos em ms
    this.renewalThreshold = 5 * 60 * 1000; // 5 minutos em ms
    this.maxSessions = 3; // Máximo de sessões simultâneas por usuário
    
    // Cache de sessões ativas em memória para performance
    this.activeSessions = new Map();
    
    // Iniciar limpeza automática
    this.startCleanupTimer();
  }

  /**
   * Criar nova sessão
   */
  async createSession(userId, userEmail, userProfile, req) {
    try {
      const sessionId = this.generateSessionId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.defaultTimeout);
      
      // Dados da sessão
      const sessionData = {
        session_id: sessionId,
        user_id: userId,
        start_time: now,
        last_activity: now,
        expires_at: expiresAt,
        login_ip: req.ip || req.connection.remoteAddress,
        login_user_agent: req.headers['user-agent'],
        login_method: 'password',
        active: true
      };
      
      // Verificar limite de sessões simultâneas
      await this.enforceSessionLimit(userId);
      
      // Salvar no banco de dados
      await this.saveSessionToDatabase(sessionData);
      
      // Adicionar ao cache
      this.activeSessions.set(sessionId, {
        ...sessionData,
        userId,
        userEmail,
        userProfile
      });
      
      // Gerar JWT com session_id
      const token = jwt.sign(
        {
          id: userId,
          email: userEmail,
          perfil: userProfile,
          session_id: sessionId,
          iat: Math.floor(now.getTime() / 1000),
          exp: Math.floor(expiresAt.getTime() / 1000)
        },
        this.jwtSecret
      );
      
      // Log de auditoria
      await auditLogger.authentication('SESSION_CREATED', userId, {
        sessionId,
        ip: sessionData.login_ip,
        userAgent: sessionData.login_user_agent,
        expiresAt: expiresAt.toISOString()
      });
      
      console.log(`🕐 SESSION: Nova sessão criada para usuário ${userId} (${sessionId})`);
      
      return {
        token,
        sessionId,
        expiresAt,
        timeout: this.defaultTimeout
      };
      
    } catch (error) {
      console.error('❌ SESSION ERROR: Falha ao criar sessão:', error);
      throw new Error('Falha ao criar sessão');
    }
  }

  /**
   * Validar sessão existente
   */
  async validateSession(token, req) {
    try {
      // Decodificar JWT
      const decoded = jwt.verify(token, this.jwtSecret);
      const sessionId = decoded.session_id;
      
      if (!sessionId) {
        throw new Error('Token sem session_id');
      }
      
      // Verificar no cache primeiro
      let session = this.activeSessions.get(sessionId);
      
      if (!session) {
        // Buscar no banco se não estiver no cache
        session = await this.getSessionFromDatabase(sessionId);
        
        if (session && session.active) {
          // Recarregar no cache
          this.activeSessions.set(sessionId, session);
        }
      }
      
      if (!session || !session.active) {
        throw new Error('Sessão não encontrada ou inativa');
      }
      
      // Verificar expiração
      const now = new Date();
      if (now > session.expires_at) {
        await this.expireSession(sessionId, 'timeout');
        throw new Error('Sessão expirada');
      }
      
      // Atualizar última atividade
      await this.updateLastActivity(sessionId, req);
      
      return {
        valid: true,
        session,
        user: {
          id: decoded.id,
          email: decoded.email,
          perfil: decoded.perfil
        },
        needsRenewal: this.needsRenewal(session)
      };
      
    } catch (error) {
      console.error('❌ SESSION VALIDATION ERROR:', error.message);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Renovar token próximo do vencimento
   */
  async renewToken(sessionId, req) {
    try {
      const session = this.activeSessions.get(sessionId);
      
      if (!session || !session.active) {
        throw new Error('Sessão inválida para renovação');
      }
      
      // Estender expiração
      const now = new Date();
      const newExpiresAt = new Date(now.getTime() + this.defaultTimeout);
      
      // Atualizar sessão
      session.expires_at = newExpiresAt;
      session.last_activity = now;
      
      // Atualizar no banco
      await this.updateSessionExpiration(sessionId, newExpiresAt);
      
      // Gerar novo token
      const newToken = jwt.sign(
        {
          id: session.userId,
          email: session.userEmail,
          perfil: session.userProfile,
          session_id: sessionId,
          iat: Math.floor(now.getTime() / 1000),
          exp: Math.floor(newExpiresAt.getTime() / 1000)
        },
        this.jwtSecret
      );
      
      // Log de auditoria
      await auditLogger.authentication('SESSION_RENEWED', session.userId, {
        sessionId,
        newExpiresAt: newExpiresAt.toISOString(),
        ip: req.ip
      });
      
      console.log(`🔄 SESSION: Token renovado para sessão ${sessionId}`);
      
      return {
        token: newToken,
        expiresAt: newExpiresAt
      };
      
    } catch (error) {
      console.error('❌ SESSION RENEWAL ERROR:', error);
      throw new Error('Falha ao renovar token');
    }
  }

  /**
   * Encerrar sessão (logout)
   */
  async terminateSession(sessionId, reason = 'manual_logout', req) {
    try {
      const session = this.activeSessions.get(sessionId);
      
      if (session) {
        // Remover do cache
        this.activeSessions.delete(sessionId);
        
        // Marcar como inativa no banco
        await this.deactivateSessionInDatabase(sessionId, reason);
        
        // Log de auditoria
        await auditLogger.authentication('SESSION_TERMINATED', session.userId, {
          sessionId,
          reason,
          duration: Date.now() - session.start_time.getTime(),
          ip: req?.ip
        });
        
        console.log(`🔚 SESSION: Sessão ${sessionId} encerrada (${reason})`);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ SESSION TERMINATION ERROR:', error);
      return false;
    }
  }

  /**
   * Verificar se token precisa de renovação
   */
  needsRenewal(session) {
    const now = new Date();
    const timeToExpiry = session.expires_at.getTime() - now.getTime();
    return timeToExpiry <= this.renewalThreshold;
  }

  /**
   * Gerar ID único de sessão
   */
  generateSessionId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2);
    return `sess_${timestamp}_${randomPart}`;
  }

  /**
   * Aplicar limite de sessões simultâneas
   */
  async enforceSessionLimit(userId) {
    try {
      // Contar sessões ativas do usuário
      const result = await db.query(
        'SELECT COUNT(*) as count FROM audit_sessions WHERE user_id = $1 AND active = true',
        [userId]
      );
      
      const activeCount = parseInt(result.rows[0].count);
      
      if (activeCount >= this.maxSessions) {
        // Encerrar a sessão mais antiga
        const oldestResult = await db.query(`
          SELECT session_id FROM audit_sessions 
          WHERE user_id = $1 AND active = true 
          ORDER BY start_time ASC 
          LIMIT 1
        `, [userId]);
        
        if (oldestResult.rows.length > 0) {
          const oldestSessionId = oldestResult.rows[0].session_id;
          await this.terminateSession(oldestSessionId, 'session_limit_exceeded');
        }
      }
      
    } catch (error) {
      console.error('❌ SESSION LIMIT ERROR:', error);
    }
  }

  /**
   * Salvar sessão no banco de dados
   */
  async saveSessionToDatabase(sessionData) {
    await db.query(`
      INSERT INTO audit_sessions (
        session_id, user_id, start_time, last_activity, expires_at,
        login_ip, login_user_agent, login_method, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      sessionData.session_id,
      sessionData.user_id,
      sessionData.start_time,
      sessionData.last_activity,
      sessionData.expires_at,
      sessionData.login_ip,
      sessionData.login_user_agent,
      sessionData.login_method,
      sessionData.active
    ]);
  }

  /**
   * Buscar sessão no banco de dados
   */
  async getSessionFromDatabase(sessionId) {
    const result = await db.query(
      'SELECT * FROM audit_sessions WHERE session_id = $1 AND active = true',
      [sessionId]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Atualizar última atividade
   */
  async updateLastActivity(sessionId, req) {
    const now = new Date();
    
    // Atualizar cache
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.last_activity = now;
      session.actions_count = (session.actions_count || 0) + 1;
    }
    
    // Atualizar banco (batch a cada 10 ações para performance)
    if (!session || session.actions_count % 10 === 0) {
      await db.query(
        'UPDATE audit_sessions SET last_activity = $1, actions_count = actions_count + 1 WHERE session_id = $2',
        [now, sessionId]
      );
    }
  }

  /**
   * Atualizar expiração da sessão
   */
  async updateSessionExpiration(sessionId, newExpiresAt) {
    await db.query(
      'UPDATE audit_sessions SET expires_at = $1 WHERE session_id = $2',
      [newExpiresAt, sessionId]
    );
  }

  /**
   * Desativar sessão no banco
   */
  async deactivateSessionInDatabase(sessionId, reason) {
    const now = new Date();
    
    await db.query(`
      UPDATE audit_sessions 
      SET active = false, end_time = $1, logout_reason = $2
      WHERE session_id = $3
    `, [now, reason, sessionId]);
  }

  /**
   * Expirar sessão por timeout
   */
  async expireSession(sessionId, reason = 'timeout') {
    await this.terminateSession(sessionId, reason);
  }

  /**
   * Limpeza automática de sessões expiradas
   */
  async cleanupExpiredSessions() {
    try {
      const now = new Date();
      
      // Limpar cache
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (now > session.expires_at) {
          this.activeSessions.delete(sessionId);
          await this.deactivateSessionInDatabase(sessionId, 'expired');
        }
      }
      
      // Limpar banco de dados
      const result = await db.query(`
        UPDATE audit_sessions 
        SET active = false, end_time = $1, logout_reason = 'expired'
        WHERE expires_at < $1 AND active = true
      `, [now]);
      
      if (result.rowCount > 0) {
        console.log(`🧹 SESSION CLEANUP: ${result.rowCount} sessões expiradas removidas`);
      }
      
    } catch (error) {
      console.error('❌ SESSION CLEANUP ERROR:', error);
    }
  }

  /**
   * Iniciar timer de limpeza automática
   */
  startCleanupTimer() {
    // Limpeza a cada 5 minutos
    setInterval(() => {
      this.cleanupExpiredSessions().catch(console.error);
    }, 5 * 60 * 1000);
    
    console.log('🕐 SESSION MANAGER: Timer de limpeza iniciado (5 min)');
  }

  /**
   * Obter estatísticas de sessões
   */
  async getSessionStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE active = true) as active_sessions,
          COUNT(*) FILTER (WHERE active = false AND logout_reason = 'expired') as expired_sessions,
          COUNT(*) FILTER (WHERE active = false AND logout_reason = 'manual_logout') as manual_logouts,
          COUNT(DISTINCT user_id) FILTER (WHERE active = true) as unique_active_users,
          AVG(EXTRACT(EPOCH FROM (end_time - start_time))) FILTER (WHERE end_time IS NOT NULL) as avg_session_duration
        FROM audit_sessions 
        WHERE start_time > NOW() - INTERVAL '24 hours'
      `);
      
      const stats = result.rows[0];
      
      return {
        activeSessions: parseInt(stats.active_sessions),
        expiredSessions: parseInt(stats.expired_sessions),
        manualLogouts: parseInt(stats.manual_logouts),
        uniqueActiveUsers: parseInt(stats.unique_active_users),
        avgSessionDuration: parseFloat(stats.avg_session_duration) || 0,
        cacheSize: this.activeSessions.size
      };
      
    } catch (error) {
      console.error('❌ SESSION STATS ERROR:', error);
      return null;
    }
  }

  /**
   * Forçar logout de todas as sessões de um usuário
   */
  async forceLogoutUser(userId, reason = 'admin_force_logout') {
    try {
      // Remover do cache
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.userId === userId) {
          this.activeSessions.delete(sessionId);
        }
      }
      
      // Desativar no banco
      const result = await db.query(`
        UPDATE audit_sessions 
        SET active = false, end_time = NOW(), logout_reason = $1
        WHERE user_id = $2 AND active = true
      `, [reason, userId]);
      
      // Log de auditoria
      await auditLogger.security('FORCE_LOGOUT_USER', {
        targetUserId: userId,
        reason,
        sessionsTerminated: result.rowCount
      });
      
      console.log(`🚫 SESSION: ${result.rowCount} sessões do usuário ${userId} encerradas (${reason})`);
      
      return result.rowCount;
      
    } catch (error) {
      console.error('❌ FORCE LOGOUT ERROR:', error);
      return 0;
    }
  }
}

// Singleton instance
const sessionManager = new SessionManager();

module.exports = sessionManager;
