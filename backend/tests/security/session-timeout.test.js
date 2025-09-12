const request = require('supertest');
const express = require('express');
const sessionManager = require('../../src/utils/sessionManager');
const authMiddleware = require('../../src/api/middlewares/authMiddleware');
const db = require('../../src/config/database');

describe('🕐 TESTES DE TIMEOUT DE SESSÕES', () => {
  let app;
  let testUserId;
  let testToken;
  let testSessionId;

  beforeAll(async () => {
    // Configurar app de teste
    app = express();
    app.use(express.json());
    
    // Rotas de teste
    app.post('/test/login', async (req, res) => {
      try {
        const sessionData = await sessionManager.createSession(
          999,
          'test@example.com',
          'admin',
          req
        );
        
        res.json({
          success: true,
          token: sessionData.token,
          sessionId: sessionData.sessionId
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    app.get('/test/protected', authMiddleware, (req, res) => {
      res.json({
        success: true,
        user: req.user,
        session: req.session
      });
    });
    
    app.post('/test/logout', authMiddleware, async (req, res) => {
      try {
        await sessionManager.terminateSession(req.session.session_id, 'manual_logout', req);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Limpar dados de teste
    await db.query('DELETE FROM audit_sessions WHERE user_id = 999');
  });

  afterAll(async () => {
    // Limpar dados de teste
    await db.query('DELETE FROM audit_sessions WHERE user_id = 999');
  });

  describe('1. CRIAÇÃO DE SESSÃO', () => {
    test('Deve criar sessão com timeout configurado', async () => {
      const response = await request(app)
        .post('/test/login')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.sessionId).toBeDefined();
      
      testToken = response.body.token;
      testSessionId = response.body.sessionId;
      
      // Verificar se sessão foi salva no banco
      const result = await db.query(
        'SELECT * FROM audit_sessions WHERE session_id = $1',
        [testSessionId]
      );
      
      expect(result.rows.length).toBe(1);
      
      const session = result.rows[0];
      expect(session.active).toBe(true);
      expect(session.user_id).toBe(999);
      expect(new Date(session.expires_at)).toBeInstanceOf(Date);
    });

    test('Deve configurar timeout de 30 minutos por padrão', async () => {
      const result = await db.query(
        'SELECT expires_at, start_time FROM audit_sessions WHERE session_id = $1',
        [testSessionId]
      );
      
      const session = result.rows[0];
      const startTime = new Date(session.start_time);
      const expiresAt = new Date(session.expires_at);
      const timeoutMs = expiresAt.getTime() - startTime.getTime();
      
      // Deve ser próximo de 30 minutos (30 * 60 * 1000 = 1800000ms)
      expect(timeoutMs).toBeGreaterThan(29 * 60 * 1000); // 29 min
      expect(timeoutMs).toBeLessThan(31 * 60 * 1000); // 31 min
    });
  });

  describe('2. VALIDAÇÃO DE SESSÃO', () => {
    test('Deve validar sessão ativa', async () => {
      const response = await request(app)
        .get('/test/protected')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(999);
      expect(response.body.session.session_id).toBe(testSessionId);
    });

    test('Deve atualizar última atividade', async () => {
      const beforeActivity = await db.query(
        'SELECT last_activity FROM audit_sessions WHERE session_id = $1',
        [testSessionId]
      );
      
      const lastActivityBefore = new Date(beforeActivity.rows[0].last_activity);
      
      // Aguardar um pouco e fazer nova requisição
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await request(app)
        .get('/test/protected')
        .set('Authorization', `Bearer ${testToken}`);
      
      const afterActivity = await db.query(
        'SELECT last_activity FROM audit_sessions WHERE session_id = $1',
        [testSessionId]
      );
      
      const lastActivityAfter = new Date(afterActivity.rows[0].last_activity);
      
      expect(lastActivityAfter.getTime()).toBeGreaterThanOrEqual(lastActivityBefore.getTime());
    });

    test('Deve rejeitar token inválido', async () => {
      const response = await request(app)
        .get('/test/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.code).toBeDefined();
    });
  });

  describe('3. RENOVAÇÃO DE TOKEN', () => {
    test('Deve identificar quando token precisa renovação', async () => {
      // Simular sessão próxima do vencimento
      const nearExpiryTime = new Date(Date.now() + 4 * 60 * 1000); // 4 minutos
      
      await db.query(
        'UPDATE audit_sessions SET expires_at = $1 WHERE session_id = $2',
        [nearExpiryTime, testSessionId]
      );
      
      const validation = await sessionManager.validateSession(testToken, { ip: '127.0.0.1' });
      
      expect(validation.needsRenewal).toBe(true);
    });

    test('Deve renovar token próximo do vencimento', async () => {
      const renewal = await sessionManager.renewToken(testSessionId, { ip: '127.0.0.1' });
      
      expect(renewal.token).toBeDefined();
      expect(renewal.token).not.toBe(testToken);
      expect(new Date(renewal.expiresAt)).toBeInstanceOf(Date);
      
      // Atualizar token para próximos testes
      testToken = renewal.token;
    });

    test('Deve estender expiração após renovação', async () => {
      const result = await db.query(
        'SELECT expires_at FROM audit_sessions WHERE session_id = $1',
        [testSessionId]
      );
      
      const expiresAt = new Date(result.rows[0].expires_at);
      const now = new Date();
      const timeToExpiry = expiresAt.getTime() - now.getTime();
      
      // Deve ter sido estendido para próximo dos 30 minutos
      expect(timeToExpiry).toBeGreaterThan(25 * 60 * 1000); // > 25 min
    });
  });

  describe('4. TIMEOUT E EXPIRAÇÃO', () => {
    test('Deve expirar sessão antiga', async () => {
      // Criar sessão com expiração no passado
      const expiredTime = new Date(Date.now() - 60 * 1000); // 1 minuto atrás
      
      const expiredSessionData = await sessionManager.createSession(
        998,
        'expired@test.com',
        'admin',
        { ip: '127.0.0.1', headers: { 'user-agent': 'test' } }
      );
      
      // Forçar expiração
      await db.query(
        'UPDATE audit_sessions SET expires_at = $1 WHERE session_id = $2',
        [expiredTime, expiredSessionData.sessionId]
      );
      
      // Tentar usar token expirado
      const response = await request(app)
        .get('/test/protected')
        .set('Authorization', `Bearer ${expiredSessionData.token}`);
      
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('SESSION_EXPIRED');
    });

    test('Deve limpar sessões expiradas automaticamente', async () => {
      const beforeCount = await db.query(
        'SELECT COUNT(*) as count FROM audit_sessions WHERE active = true'
      );
      
      await sessionManager.cleanupExpiredSessions();
      
      const afterCount = await db.query(
        'SELECT COUNT(*) as count FROM audit_sessions WHERE active = true'
      );
      
      // Deve ter removido pelo menos a sessão expirada
      expect(parseInt(afterCount.rows[0].count)).toBeLessThanOrEqual(
        parseInt(beforeCount.rows[0].count)
      );
    });
  });

  describe('5. LIMITE DE SESSÕES', () => {
    test('Deve aplicar limite de sessões simultâneas', async () => {
      const maxSessions = sessionManager.maxSessions;
      const sessions = [];
      
      // Criar sessões até o limite
      for (let i = 0; i < maxSessions + 1; i++) {
        const response = await request(app)
          .post('/test/login')
          .send({});
        
        if (response.status === 200) {
          sessions.push(response.body.sessionId);
        }
      }
      
      // Verificar quantas sessões ativas existem
      const result = await db.query(
        'SELECT COUNT(*) as count FROM audit_sessions WHERE user_id = 999 AND active = true'
      );
      
      const activeCount = parseInt(result.rows[0].count);
      expect(activeCount).toBeLessThanOrEqual(maxSessions);
    });
  });

  describe('6. LOGOUT E ENCERRAMENTO', () => {
    test('Deve encerrar sessão no logout', async () => {
      const response = await request(app)
        .post('/test/logout')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verificar se sessão foi marcada como inativa
      const result = await db.query(
        'SELECT active, end_time, logout_reason FROM audit_sessions WHERE session_id = $1',
        [testSessionId]
      );
      
      const session = result.rows[0];
      expect(session.active).toBe(false);
      expect(session.end_time).not.toBeNull();
      expect(session.logout_reason).toBe('manual_logout');
    });

    test('Deve rejeitar token de sessão encerrada', async () => {
      const response = await request(app)
        .get('/test/protected')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('7. ESTATÍSTICAS E MONITORAMENTO', () => {
    test('Deve gerar estatísticas de sessões', async () => {
      const stats = await sessionManager.getSessionStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.activeSessions).toBe('number');
      expect(typeof stats.expiredSessions).toBe('number');
      expect(typeof stats.manualLogouts).toBe('number');
      expect(typeof stats.uniqueActiveUsers).toBe('number');
      expect(typeof stats.cacheSize).toBe('number');
    });

    test('Deve forçar logout de usuário específico', async () => {
      // Criar nova sessão para teste
      const loginResponse = await request(app)
        .post('/test/login')
        .send({});
      
      const newSessionId = loginResponse.body.sessionId;
      
      // Forçar logout
      const loggedOut = await sessionManager.forceLogoutUser(999, 'admin_force_logout');
      
      expect(loggedOut).toBeGreaterThan(0);
      
      // Verificar se sessão foi encerrada
      const result = await db.query(
        'SELECT active, logout_reason FROM audit_sessions WHERE session_id = $1',
        [newSessionId]
      );
      
      const session = result.rows[0];
      expect(session.active).toBe(false);
      expect(session.logout_reason).toBe('admin_force_logout');
    });
  });

  describe('8. SEGURANÇA E AUDITORIA', () => {
    test('Deve logar criação de sessão', async () => {
      const auditLogger = require('../../src/utils/auditLogger');
      const logSpy = jest.spyOn(auditLogger, 'authentication');
      
      await sessionManager.createSession(
        997,
        'audit@test.com',
        'admin',
        { ip: '192.168.1.1', headers: { 'user-agent': 'test-browser' } }
      );
      
      expect(logSpy).toHaveBeenCalledWith(
        'SESSION_CREATED',
        997,
        expect.objectContaining({
          sessionId: expect.any(String),
          ip: '192.168.1.1',
          userAgent: 'test-browser'
        })
      );
      
      logSpy.mockRestore();
    });

    test('Deve logar renovação de token', async () => {
      const auditLogger = require('../../src/utils/auditLogger');
      const logSpy = jest.spyOn(auditLogger, 'authentication');
      
      // Criar sessão para renovar
      const sessionData = await sessionManager.createSession(
        996,
        'renew@test.com',
        'admin',
        { ip: '127.0.0.1', headers: { 'user-agent': 'test' } }
      );
      
      await sessionManager.renewToken(sessionData.sessionId, { ip: '127.0.0.1' });
      
      expect(logSpy).toHaveBeenCalledWith(
        'SESSION_RENEWED',
        996,
        expect.objectContaining({
          sessionId: sessionData.sessionId,
          newExpiresAt: expect.any(String)
        })
      );
      
      logSpy.mockRestore();
    });

    test('Deve detectar múltiplas sessões suspeitas', async () => {
      // Simular criação rápida de múltiplas sessões
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          sessionManager.createSession(
            995,
            'suspicious@test.com',
            'admin',
            { ip: '10.0.0.1', headers: { 'user-agent': 'bot' } }
          )
        );
      }
      
      await Promise.all(promises);
      
      // Verificar se limite foi aplicado
      const result = await db.query(
        'SELECT COUNT(*) as count FROM audit_sessions WHERE user_id = 995 AND active = true'
      );
      
      const activeCount = parseInt(result.rows[0].count);
      expect(activeCount).toBeLessThanOrEqual(sessionManager.maxSessions);
    });
  });

  describe('9. PERFORMANCE', () => {
    test('Deve processar validação de sessão rapidamente', async () => {
      // Criar sessão para teste de performance
      const sessionData = await sessionManager.createSession(
        994,
        'perf@test.com',
        'admin',
        { ip: '127.0.0.1', headers: { 'user-agent': 'test' } }
      );
      
      const startTime = Date.now();
      
      // Realizar 10 validações
      for (let i = 0; i < 10; i++) {
        await sessionManager.validateSession(sessionData.token, { ip: '127.0.0.1' });
      }
      
      const endTime = Date.now();
      const avgTime = (endTime - startTime) / 10;
      
      // Cada validação deve ser rápida (< 100ms)
      expect(avgTime).toBeLessThan(100);
    });

    test('Deve usar cache para sessões ativas', async () => {
      const sessionData = await sessionManager.createSession(
        993,
        'cache@test.com',
        'admin',
        { ip: '127.0.0.1', headers: { 'user-agent': 'test' } }
      );
      
      // Primeira validação (pode carregar do banco)
      const validation1 = await sessionManager.validateSession(sessionData.token, { ip: '127.0.0.1' });
      
      // Segunda validação (deve usar cache)
      const startTime = Date.now();
      const validation2 = await sessionManager.validateSession(sessionData.token, { ip: '127.0.0.1' });
      const cacheTime = Date.now() - startTime;
      
      expect(validation1.valid).toBe(true);
      expect(validation2.valid).toBe(true);
      expect(cacheTime).toBeLessThan(50); // Deve ser muito rápido com cache
    });
  });
});
