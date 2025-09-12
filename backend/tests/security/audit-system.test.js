const request = require('supertest');
const db = require('../../src/config/database');
const auditLogger = require('../../src/utils/auditLogger');

// Mock do app para testes
const express = require('express');
const { auditMiddleware } = require('../../src/api/middlewares/auditMiddleware');

describe('🔍 TESTES DO SISTEMA DE AUDITORIA', () => {
  let app;
  
  beforeAll(async () => {
    // Configurar app de teste
    app = express();
    app.use(express.json());
    app.use(auditMiddleware);
    
    // Rotas de teste
    app.get('/test/public', (req, res) => {
      res.json({ message: 'public endpoint' });
    });
    
    app.post('/api/auth/login', (req, res) => {
      res.json({ success: true, token: 'test-token' });
    });
    
    app.post('/api/face/recognize', (req, res) => {
      res.json({ success: true, person: 'test-person' });
    });
    
    app.get('/test/error', (req, res) => {
      res.status(500).json({ error: 'test error' });
    });
    
    // Limpar logs de teste
    await db.query('DELETE FROM logs_auditoria WHERE source = $1', ['test']);
  });
  
  afterAll(async () => {
    // Limpar logs de teste
    await db.query('DELETE FROM logs_auditoria WHERE source = $1', ['test']);
  });

  describe('1. AUDIT LOGGER', () => {
    test('Deve registrar log de auditoria básico', async () => {
      const testData = {
        action: 'TEST_ACTION',
        userId: 123,
        userEmail: 'test@example.com',
        ip: '127.0.0.1',
        source: 'test'
      };
      
      await auditLogger.log(testData);
      
      // Aguardar processamento do batch
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT * FROM logs_auditoria WHERE action = $1 AND source = $2',
        ['TEST_ACTION', 'test']
      );
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      const log = result.rows[0];
      expect(log.action).toBe('TEST_ACTION');
      expect(log.user_id).toBe(123);
      expect(log.user_email).toBe('test@example.com');
      expect(log.user_ip.toString()).toBe('127.0.0.1');
    });

    test('Deve categorizar ações automaticamente', async () => {
      const testCases = [
        { action: 'LOGIN_SUCCESS', expectedCategory: 'AUTHENTICATION' },
        { action: 'FACE_RECOGNITION', expectedCategory: 'BIOMETRIC' },
        { action: 'CREATE_USER', expectedCategory: 'DATA_ACCESS' },
        { action: 'SUSPICIOUS_ACTIVITY', expectedCategory: 'SECURITY' }
      ];
      
      for (const testCase of testCases) {
        await auditLogger.log({
          action: testCase.action,
          source: 'test'
        });
      }
      
      // Aguardar processamento
      await new Promise(resolve => setTimeout(resolve, 200));
      
      for (const testCase of testCases) {
        const result = await db.query(
          'SELECT category FROM logs_auditoria WHERE action = $1 AND source = $2',
          [testCase.action, 'test']
        );
        
        expect(result.rows[0]?.category).toBe(testCase.expectedCategory);
      }
    });

    test('Deve determinar severidade automaticamente', async () => {
      const testCases = [
        { action: 'EMERGENCY_ACCESS', expectedSeverity: 'critical' },
        { action: 'LOGIN_FAILED', statusCode: 401, expectedSeverity: 'error' },
        { action: 'SUSPICIOUS_LOGIN', expectedSeverity: 'warning' },
        { action: 'USER_VIEW', expectedSeverity: 'info' }
      ];
      
      for (const testCase of testCases) {
        await auditLogger.log({
          action: testCase.action,
          statusCode: testCase.statusCode,
          source: 'test'
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      for (const testCase of testCases) {
        const result = await db.query(
          'SELECT severity FROM logs_auditoria WHERE action = $1 AND source = $2',
          [testCase.action, 'test']
        );
        
        expect(result.rows[0]?.severity).toBe(testCase.expectedSeverity);
      }
    });

    test('Deve gerar tags para indexação', async () => {
      await auditLogger.log({
        action: 'TEST_TAGS',
        method: 'POST',
        userProfile: 'admin',
        statusCode: 200,
        source: 'test'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT tags FROM logs_auditoria WHERE action = $1 AND source = $2',
        ['TEST_TAGS', 'test']
      );
      
      const tags = result.rows[0]?.tags;
      expect(tags).toContain('test_tags');
      expect(tags).toContain('method:post');
      expect(tags).toContain('profile:admin');
      expect(tags).toContain('status:2xx');
    });
  });

  describe('2. MIDDLEWARE DE AUDITORIA', () => {
    test('Deve auditar endpoints sensíveis', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'test123' });
      
      expect(response.status).toBe(200);
      
      // Aguardar processamento do log
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT * FROM logs_auditoria WHERE endpoint LIKE $1',
        ['%/api/auth/login%']
      );
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      const log = result.rows[0];
      expect(log.method).toBe('POST');
      expect(log.status_code).toBe(200);
      expect(log.category).toBe('AUTHENTICATION');
    });

    test('Deve auditar reconhecimento facial', async () => {
      const response = await request(app)
        .post('/api/face/recognize')
        .send({ image: 'base64-image-data' });
      
      expect(response.status).toBe(200);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT * FROM logs_auditoria WHERE endpoint LIKE $1',
        ['%/api/face/recognize%']
      );
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      const log = result.rows[0];
      expect(log.category).toBe('BIOMETRIC');
      expect(log.data_category).toBe('biometric');
      expect(log.legal_basis).toBe('consent');
    });

    test('Deve auditar erros de sistema', async () => {
      const response = await request(app)
        .get('/test/error');
      
      expect(response.status).toBe(500);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT * FROM logs_auditoria WHERE endpoint LIKE $1 AND status_code = $2',
        ['%/test/error%', 500]
      );
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      const log = result.rows[0];
      expect(log.severity).toBe('critical');
      expect(log.success).toBe(false);
    });

    test('Não deve auditar endpoints públicos não sensíveis', async () => {
      const response = await request(app)
        .get('/test/public');
      
      expect(response.status).toBe(200);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT * FROM logs_auditoria WHERE endpoint LIKE $1',
        ['%/test/public%']
      );
      
      // Endpoint público não deve gerar log de auditoria
      expect(result.rows.length).toBe(0);
    });
  });

  describe('3. MÉTODOS DE CONVENIÊNCIA', () => {
    test('auditLogger.authentication() deve funcionar', async () => {
      await auditLogger.authentication('LOGIN_SUCCESS', 456, {
        ip: '192.168.1.1',
        userAgent: 'test-browser',
        source: 'test'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT * FROM logs_auditoria WHERE action = $1 AND user_id = $2',
        ['LOGIN_SUCCESS', 456]
      );
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      const log = result.rows[0];
      expect(log.category).toBe('AUTHENTICATION');
      expect(log.user_ip.toString()).toBe('192.168.1.1');
    });

    test('auditLogger.biometric() deve funcionar', async () => {
      await auditLogger.biometric('FACE_SCAN', 789, {
        dataSubjectCpf: '12345678901',
        source: 'test'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT * FROM logs_auditoria WHERE action = $1 AND user_id = $2',
        ['FACE_SCAN', 789]
      );
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      const log = result.rows[0];
      expect(log.category).toBe('BIOMETRIC');
      expect(log.data_category).toBe('biometric');
      expect(log.legal_basis).toBe('consent');
      expect(log.data_subject_cpf).toBe('12345678901');
    });

    test('auditLogger.security() deve funcionar', async () => {
      await auditLogger.security('BRUTE_FORCE_DETECTED', {
        ip: '10.0.0.1',
        attempts: 10,
        source: 'test'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT * FROM logs_auditoria WHERE action = $1',
        ['BRUTE_FORCE_DETECTED']
      );
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      const log = result.rows[0];
      expect(log.category).toBe('SECURITY');
      expect(log.severity).toBe('warning');
    });

    test('auditLogger.dataAccess() deve funcionar', async () => {
      await auditLogger.dataAccess('VIEW_USER', 101, 'usuario', '202', {
        source: 'test'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT * FROM logs_auditoria WHERE action = $1 AND resource_id = $2',
        ['VIEW_USER', '202']
      );
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      const log = result.rows[0];
      expect(log.category).toBe('DATA_ACCESS');
      expect(log.resource_type).toBe('usuario');
      expect(log.user_id).toBe(101);
    });
  });

  describe('4. LGPD COMPLIANCE', () => {
    test('Deve registrar base legal corretamente', async () => {
      const testCases = [
        { action: 'FACE_RECOGNITION', expectedBasis: 'consent' },
        { action: 'REGISTER_POINT', expectedBasis: 'contract' },
        { action: 'LOGIN', expectedBasis: 'legitimate_interest' },
        { action: 'CREATE_USER', expectedBasis: 'contract' }
      ];
      
      for (const testCase of testCases) {
        await auditLogger.log({
          action: testCase.action,
          source: 'test'
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      for (const testCase of testCases) {
        const result = await db.query(
          'SELECT legal_basis FROM logs_auditoria WHERE action = $1 AND source = $2',
          [testCase.action, 'test']
        );
        
        expect(result.rows[0]?.legal_basis).toBe(testCase.expectedBasis);
      }
    });

    test('Deve registrar CPF do titular quando fornecido', async () => {
      await auditLogger.log({
        action: 'ACCESS_PERSONAL_DATA',
        dataSubjectCpf: '98765432100',
        source: 'test'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT data_subject_cpf FROM logs_auditoria WHERE action = $1',
        ['ACCESS_PERSONAL_DATA']
      );
      
      expect(result.rows[0]?.data_subject_cpf).toBe('98765432100');
    });

    test('Deve definir período de retenção padrão', async () => {
      await auditLogger.log({
        action: 'TEST_RETENTION',
        source: 'test'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT retention_days FROM logs_auditoria WHERE action = $1',
        ['TEST_RETENTION']
      );
      
      expect(result.rows[0]?.retention_days).toBe(2555); // 7 anos
    });
  });

  describe('5. PERFORMANCE E CONFIABILIDADE', () => {
    test('Deve processar logs em lote', async () => {
      const startTime = Date.now();
      
      // Enviar múltiplos logs rapidamente
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(auditLogger.log({
          action: `BATCH_TEST_${i}`,
          userId: i,
          source: 'test'
        }));
      }
      
      await Promise.all(promises);
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(1000); // Deve ser rápido
      
      // Aguardar processamento do batch
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await db.query(
        'SELECT COUNT(*) as count FROM logs_auditoria WHERE action LIKE $1',
        ['BATCH_TEST_%']
      );
      
      expect(parseInt(result.rows[0].count)).toBe(20);
    });

    test('Deve lidar com falhas de inserção', async () => {
      // Tentar inserir log com dados inválidos
      await expect(auditLogger.log({
        action: 'TEST_INVALID',
        severity: 'invalid_severity', // Severidade inválida
        source: 'test'
      })).resolves.not.toThrow();
      
      // Sistema deve continuar funcionando
      await auditLogger.log({
        action: 'TEST_AFTER_ERROR',
        source: 'test'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT * FROM logs_auditoria WHERE action = $1',
        ['TEST_AFTER_ERROR']
      );
      
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('Deve gerar estatísticas corretamente', async () => {
      // Inserir alguns logs de teste para estatísticas
      await auditLogger.log({ action: 'STATS_TEST_1', category: 'AUTHENTICATION', source: 'test' });
      await auditLogger.log({ action: 'STATS_TEST_2', category: 'BIOMETRIC', source: 'test' });
      await auditLogger.log({ action: 'STATS_TEST_3', category: 'AUTHENTICATION', source: 'test' });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const stats = await auditLogger.getStats(1); // 1 dia
      
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
      
      // Verificar estrutura das estatísticas
      const firstStat = stats[0];
      expect(firstStat).toHaveProperty('category');
      expect(firstStat).toHaveProperty('severity');
      expect(firstStat).toHaveProperty('count');
      expect(firstStat).toHaveProperty('unique_users');
    });
  });

  describe('6. BUSCA E CONSULTA', () => {
    test('Deve gerar texto pesquisável automaticamente', async () => {
      await auditLogger.log({
        action: 'SEARCHABLE_TEST',
        userEmail: 'search@test.com',
        endpoint: '/api/test/search',
        additionalData: { key: 'searchable value' },
        source: 'test'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(
        'SELECT searchable_text FROM logs_auditoria WHERE action = $1',
        ['SEARCHABLE_TEST']
      );
      
      const searchableText = result.rows[0]?.searchable_text;
      expect(searchableText).toContain('SEARCHABLE_TEST');
      expect(searchableText).toContain('search@test.com');
      expect(searchableText).toContain('/api/test/search');
    });

    test('Deve permitir busca por texto', async () => {
      await auditLogger.log({
        action: 'UNIQUE_SEARCH_TERM',
        userEmail: 'unique@search.com',
        source: 'test'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await db.query(`
        SELECT * FROM logs_auditoria 
        WHERE to_tsvector('portuguese', searchable_text) @@ plainto_tsquery('portuguese', 'unique search')
        AND source = 'test'
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].action).toBe('UNIQUE_SEARCH_TERM');
    });
  });
});

describe('🔄 TESTES DE ROTAÇÃO DE LOGS', () => {
  const logRotationManager = require('../../src/utils/logRotation');
  
  test('Deve calcular estatísticas de logs', async () => {
    const stats = await logRotationManager.getLogStats();
    
    expect(stats).toBeDefined();
    expect(stats).toHaveProperty('database');
    expect(stats).toHaveProperty('files');
    expect(Array.isArray(stats.database)).toBe(true);
  });

  test('Deve formatar bytes corretamente', () => {
    expect(logRotationManager.formatBytes(0)).toBe('0 Bytes');
    expect(logRotationManager.formatBytes(1024)).toBe('1 KB');
    expect(logRotationManager.formatBytes(1048576)).toBe('1 MB');
    expect(logRotationManager.formatBytes(1073741824)).toBe('1 GB');
  });

  test('Deve ter políticas de retenção definidas', () => {
    expect(logRotationManager.retentionPolicies).toBeDefined();
    expect(logRotationManager.retentionPolicies.audit).toBe(2555); // 7 anos
    expect(logRotationManager.retentionPolicies.biometric).toBe(2555); // 7 anos
    expect(logRotationManager.retentionPolicies.security).toBe(2555); // 7 anos
  });
});
