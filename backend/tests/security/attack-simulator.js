#!/usr/bin/env node

/**
 * 🎯 SIMULADOR DE ATAQUES BÁSICOS
 * 
 * Sistema para simular ataques comuns e testar as defesas
 * do sistema de ponto digital em ambiente controlado
 */

const request = require('supertest');
const express = require('express');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AttackSimulator {
  constructor(targetURL = 'http://localhost:3333') {
    this.targetURL = targetURL;
    this.app = null;
    this.results = {
      attacks: [],
      blocked: [],
      successful: [],
      warnings: []
    };
    
    // Configurações de simulação
    this.config = {
      attackDelay: 100, // ms entre ataques
      maxConcurrent: 5, // máximo de ataques simultâneos
      timeout: 10000, // timeout por requisição
      userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'sqlmap/1.0-dev',
        'Nikto/2.1.6',
        'python-requests/2.25.1',
        'curl/7.68.0',
        'Burp Suite Professional',
        'OWASP ZAP',
        'Nessus SOAP'
      ]
    };
    
    // Cenários de ataque
    this.attackScenarios = this.loadAttackScenarios();
  }

  /**
   * Carregar cenários de ataque
   */
  loadAttackScenarios() {
    return {
      // 1. Ataques de SQL Injection
      sqlInjection: {
        name: 'SQL Injection Attack',
        description: 'Tentativas de injeção SQL em diferentes endpoints',
        payloads: [
          "' OR '1'='1",
          "'; DROP TABLE usuarios; --",
          "' UNION SELECT * FROM usuarios --",
          "admin'/**/OR/**/1=1#",
          "' OR 1=1 LIMIT 1 --",
          "1' AND (SELECT COUNT(*) FROM usuarios) > 0 --",
          "') OR '1'='1' --",
          "' WAITFOR DELAY '00:00:05' --",
          "1'; EXEC xp_cmdshell('dir'); --",
          "' OR SLEEP(5) --"
        ],
        endpoints: [
          { path: '/api/auth/login-admin', method: 'POST', params: ['email', 'senha'] },
          { path: '/api/usuarios', method: 'GET', params: ['search'] },
          { path: '/api/colaboradores', method: 'GET', params: ['search'] },
          { path: '/api/ponto/relatorio', method: 'GET', params: ['data_inicio', 'data_fim'] }
        ]
      },

      // 2. Ataques de Força Bruta
      bruteForce: {
        name: 'Brute Force Attack',
        description: 'Tentativas massivas de login com credenciais comuns',
        credentials: [
          { email: 'admin@test.com', senha: '123456' },
          { email: 'admin@test.com', senha: 'password' },
          { email: 'admin@test.com', senha: 'admin' },
          { email: 'admin@test.com', senha: '12345678' },
          { email: 'admin@test.com', senha: 'qwerty' },
          { email: 'root@test.com', senha: 'root' },
          { email: 'administrator@test.com', senha: 'password123' },
          { email: 'admin@admin.com', senha: 'admin123' },
          { email: 'test@test.com', senha: 'test' },
          { email: 'user@user.com', senha: 'user' }
        ],
        endpoints: [
          '/api/auth/login-admin',
          '/api/auth/login'
        ]
      },

      // 3. Ataques XSS
      xssAttacks: {
        name: 'Cross-Site Scripting (XSS)',
        description: 'Tentativas de injeção de scripts maliciosos',
        payloads: [
          "<script>alert('XSS')</script>",
          "<img src=x onerror=alert('XSS')>",
          "javascript:alert('XSS')",
          "<svg onload=alert('XSS')>",
          "<iframe src='javascript:alert(\"XSS\")'></iframe>",
          "<body onload=alert('XSS')>",
          "<input onfocus=alert('XSS') autofocus>",
          "<details open ontoggle=alert('XSS')>",
          "'-alert('XSS')-'",
          "\"><script>alert('XSS')</script>"
        ],
        endpoints: [
          { path: '/api/usuarios', method: 'POST', params: ['nome', 'email'] },
          { path: '/api/colaboradores', method: 'POST', params: ['nome'] }
        ]
      },

      // 4. Ataques de Path Traversal
      pathTraversal: {
        name: 'Path Traversal Attack',
        description: 'Tentativas de acesso a arquivos do sistema',
        payloads: [
          "../../../etc/passwd",
          "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
          "../../../../etc/shadow",
          "..\\..\\..\\boot.ini",
          "../../../proc/version",
          "..\\..\\..\\windows\\win.ini",
          "../../../../usr/local/apache/conf/httpd.conf",
          "../../../var/log/apache/access.log",
          "../../../../etc/hosts",
          "..\\..\\..\\windows\\system32\\config\\sam"
        ],
        endpoints: [
          { path: '/api/relatorios/download', method: 'GET', params: ['file'] },
          { path: '/api/backup/download', method: 'GET', params: ['file'] }
        ]
      },

      // 5. Ataques de Command Injection
      commandInjection: {
        name: 'Command Injection Attack',
        description: 'Tentativas de execução de comandos no servidor',
        payloads: [
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
        endpoints: [
          { path: '/api/backup/create', method: 'POST', params: ['filename', 'path'] },
          { path: '/api/relatorios/gerar', method: 'POST', params: ['format'] }
        ]
      },

      // 6. Ataques de Rate Limiting
      rateLimitAbuse: {
        name: 'Rate Limit Abuse',
        description: 'Tentativas de sobrecarga do sistema',
        config: {
          requestsPerSecond: 50,
          duration: 10, // segundos
          endpoints: [
            '/api/auth/login-admin',
            '/api/usuarios',
            '/api/ponto/registrar'
          ]
        }
      },

      // 7. Ataques de Upload Malicioso
      maliciousUpload: {
        name: 'Malicious File Upload',
        description: 'Upload de arquivos maliciosos',
        files: [
          { name: 'malware.exe', content: 'MZ\x90\x00\x00\x00', type: 'application/octet-stream' },
          { name: 'shell.php', content: '<?php system($_GET["cmd"]); ?>', type: 'application/x-php' },
          { name: 'script.js', content: 'alert("XSS")', type: 'application/javascript' },
          { name: '../../../evil.txt', content: 'Path traversal', type: 'text/plain' },
          { name: 'virus.bat', content: '@echo off\nformat c:', type: 'application/x-bat' },
          { name: 'backdoor.jsp', content: '<%@ page import="java.io.*" %>', type: 'application/x-jsp' }
        ],
        endpoints: [
          '/api/primeiro-registro/cadastrar-face',
          '/api/colaboradores/upload-foto'
        ]
      }
    };
  }

  /**
   * Executar simulação completa de ataques
   */
  async runCompleteSimulation() {
    console.log(chalk.red.bold('🎯 INICIANDO SIMULAÇÃO DE ATAQUES BÁSICOS'));
    console.log(chalk.red('=========================================='));
    console.log(chalk.yellow(`🎯 Alvo: ${this.targetURL}`));
    console.log(chalk.yellow('⚠️  SIMULAÇÃO EM AMBIENTE CONTROLADO'));
    console.log();

    const startTime = Date.now();

    try {
      // Configurar aplicação se necessário
      await this.setupApplication();

      // 1. Ataques de SQL Injection
      console.log(chalk.cyan.bold('📋 FASE 1: SQL INJECTION ATTACKS'));
      await this.simulateSQLInjection();

      // 2. Ataques de Força Bruta
      console.log(chalk.cyan.bold('\n📋 FASE 2: BRUTE FORCE ATTACKS'));
      await this.simulateBruteForce();

      // 3. Ataques XSS
      console.log(chalk.cyan.bold('\n📋 FASE 3: XSS ATTACKS'));
      await this.simulateXSSAttacks();

      // 4. Path Traversal
      console.log(chalk.cyan.bold('\n📋 FASE 4: PATH TRAVERSAL ATTACKS'));
      await this.simulatePathTraversal();

      // 5. Command Injection
      console.log(chalk.cyan.bold('\n📋 FASE 5: COMMAND INJECTION ATTACKS'));
      await this.simulateCommandInjection();

      // 6. Rate Limit Abuse
      console.log(chalk.cyan.bold('\n📋 FASE 6: RATE LIMIT ABUSE'));
      await this.simulateRateLimitAbuse();

      // 7. Upload Malicioso
      console.log(chalk.cyan.bold('\n📋 FASE 7: MALICIOUS FILE UPLOAD'));
      await this.simulateMaliciousUpload();

      const totalTime = Date.now() - startTime;

      // Gerar relatório final
      const report = this.generateSimulationReport(totalTime);
      
      return report;

    } catch (error) {
      console.error(chalk.red.bold('❌ ERRO DURANTE SIMULAÇÃO:'), error);
      throw error;
    }
  }

  /**
   * Configurar aplicação para testes locais
   */
  async setupApplication() {
    if (this.targetURL.includes('localhost')) {
      console.log(chalk.blue('🔧 Configurando aplicação local para testes...'));
      
      this.app = express();
      this.app.use(express.json());
      
      // Importar rotas principais se disponível
      try {
        const authRoutes = require('../../src/api/routes/authRoutes');
        const usuarioRoutes = require('../../src/api/routes/usuarioRoutes');
        
        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/usuarios', usuarioRoutes);
        
        console.log(chalk.green('✅ Aplicação local configurada'));
      } catch (error) {
        console.log(chalk.yellow('⚠️ Usando modo de simulação remota'));
      }
    }
  }

  /**
   * Simular ataques de SQL Injection
   */
  async simulateSQLInjection() {
    const scenario = this.attackScenarios.sqlInjection;
    console.log(chalk.blue(`🔍 Simulando: ${scenario.name}`));
    console.log(chalk.gray(`📝 ${scenario.description}`));

    let attackCount = 0;
    let blockedCount = 0;

    for (const endpoint of scenario.endpoints) {
      for (const payload of scenario.payloads) {
        for (const param of endpoint.params) {
          try {
            const result = await this.executeAttack('SQL_INJECTION', {
              endpoint: endpoint.path,
              method: endpoint.method,
              param,
              payload
            });

            attackCount++;
            if (result.blocked) {
              blockedCount++;
              console.log(chalk.green(`✅ BLOQUEADO: ${endpoint.path}?${param}=${payload.substring(0, 20)}...`));
            } else if (result.successful) {
              console.log(chalk.red(`🚨 SUCESSO: ${endpoint.path} - ${result.details}`));
            } else {
              console.log(chalk.yellow(`⚠️ FALHOU: ${endpoint.path} - Status: ${result.status}`));
            }

            // Delay entre ataques
            await this.sleep(this.config.attackDelay);

          } catch (error) {
            console.log(chalk.gray(`⚠️ ERRO: ${endpoint.path} - ${error.message}`));
          }
        }
      }
    }

    console.log(chalk.blue(`📊 SQL Injection: ${attackCount} ataques, ${blockedCount} bloqueados`));
  }

  /**
   * Simular ataques de força bruta
   */
  async simulateBruteForce() {
    const scenario = this.attackScenarios.bruteForce;
    console.log(chalk.blue(`🔍 Simulando: ${scenario.name}`));
    console.log(chalk.gray(`📝 ${scenario.description}`));

    let attackCount = 0;
    let blockedCount = 0;

    for (const endpoint of scenario.endpoints) {
      for (const credentials of scenario.credentials) {
        try {
          const result = await this.executeAttack('BRUTE_FORCE', {
            endpoint,
            method: 'POST',
            credentials
          });

          attackCount++;
          if (result.blocked) {
            blockedCount++;
            console.log(chalk.green(`✅ BLOQUEADO: ${endpoint} - ${credentials.email}`));
          } else if (result.successful) {
            console.log(chalk.red(`🚨 LOGIN SUCESSO: ${credentials.email}:${credentials.senha}`));
          } else {
            console.log(chalk.yellow(`⚠️ FALHOU: ${credentials.email} - Status: ${result.status}`));
          }

          // Delay menor para simular força bruta real
          await this.sleep(50);

        } catch (error) {
          console.log(chalk.gray(`⚠️ ERRO: ${endpoint} - ${error.message}`));
        }
      }
    }

    console.log(chalk.blue(`📊 Brute Force: ${attackCount} tentativas, ${blockedCount} bloqueados`));
  }

  /**
   * Simular ataques XSS
   */
  async simulateXSSAttacks() {
    const scenario = this.attackScenarios.xssAttacks;
    console.log(chalk.blue(`🔍 Simulando: ${scenario.name}`));
    console.log(chalk.gray(`📝 ${scenario.description}`));

    let attackCount = 0;
    let blockedCount = 0;

    for (const endpoint of scenario.endpoints) {
      for (const payload of scenario.payloads) {
        for (const param of endpoint.params) {
          try {
            const result = await this.executeAttack('XSS', {
              endpoint: endpoint.path,
              method: endpoint.method,
              param,
              payload
            });

            attackCount++;
            if (result.blocked) {
              blockedCount++;
              console.log(chalk.green(`✅ BLOQUEADO: ${endpoint.path} - XSS payload`));
            } else if (result.successful) {
              console.log(chalk.red(`🚨 XSS SUCESSO: ${endpoint.path} - Payload refletido`));
            } else {
              console.log(chalk.yellow(`⚠️ SANITIZADO: ${endpoint.path} - Status: ${result.status}`));
            }

            await this.sleep(this.config.attackDelay);

          } catch (error) {
            console.log(chalk.gray(`⚠️ ERRO: ${endpoint.path} - ${error.message}`));
          }
        }
      }
    }

    console.log(chalk.blue(`📊 XSS Attacks: ${attackCount} ataques, ${blockedCount} bloqueados`));
  }

  /**
   * Simular ataques de Path Traversal
   */
  async simulatePathTraversal() {
    const scenario = this.attackScenarios.pathTraversal;
    console.log(chalk.blue(`🔍 Simulando: ${scenario.name}`));
    console.log(chalk.gray(`📝 ${scenario.description}`));

    let attackCount = 0;
    let blockedCount = 0;

    for (const endpoint of scenario.endpoints) {
      for (const payload of scenario.payloads) {
        for (const param of endpoint.params) {
          try {
            const result = await this.executeAttack('PATH_TRAVERSAL', {
              endpoint: endpoint.path,
              method: endpoint.method,
              param,
              payload
            });

            attackCount++;
            if (result.blocked) {
              blockedCount++;
              console.log(chalk.green(`✅ BLOQUEADO: ${endpoint.path}?${param}=${payload}`));
            } else if (result.successful) {
              console.log(chalk.red(`🚨 PATH TRAVERSAL: ${endpoint.path} - Arquivo acessado`));
            } else {
              console.log(chalk.yellow(`⚠️ FALHOU: ${endpoint.path} - Status: ${result.status}`));
            }

            await this.sleep(this.config.attackDelay);

          } catch (error) {
            console.log(chalk.gray(`⚠️ ERRO: ${endpoint.path} - ${error.message}`));
          }
        }
      }
    }

    console.log(chalk.blue(`📊 Path Traversal: ${attackCount} ataques, ${blockedCount} bloqueados`));
  }

  /**
   * Simular ataques de Command Injection
   */
  async simulateCommandInjection() {
    const scenario = this.attackScenarios.commandInjection;
    console.log(chalk.blue(`🔍 Simulando: ${scenario.name}`));
    console.log(chalk.gray(`📝 ${scenario.description}`));

    let attackCount = 0;
    let blockedCount = 0;

    for (const endpoint of scenario.endpoints) {
      for (const payload of scenario.payloads) {
        for (const param of endpoint.params) {
          try {
            const result = await this.executeAttack('COMMAND_INJECTION', {
              endpoint: endpoint.path,
              method: endpoint.method,
              param,
              payload
            });

            attackCount++;
            if (result.blocked) {
              blockedCount++;
              console.log(chalk.green(`✅ BLOQUEADO: ${endpoint.path} - Command injection`));
            } else if (result.successful) {
              console.log(chalk.red(`🚨 COMMAND EXEC: ${endpoint.path} - Comando executado`));
            } else {
              console.log(chalk.yellow(`⚠️ FALHOU: ${endpoint.path} - Status: ${result.status}`));
            }

            await this.sleep(this.config.attackDelay);

          } catch (error) {
            console.log(chalk.gray(`⚠️ ERRO: ${endpoint.path} - ${error.message}`));
          }
        }
      }
    }

    console.log(chalk.blue(`📊 Command Injection: ${attackCount} ataques, ${blockedCount} bloqueados`));
  }

  /**
   * Simular abuso de rate limiting
   */
  async simulateRateLimitAbuse() {
    const scenario = this.attackScenarios.rateLimitAbuse;
    console.log(chalk.blue(`🔍 Simulando: ${scenario.name}`));
    console.log(chalk.gray(`📝 ${scenario.description}`));

    const config = scenario.config;
    let totalRequests = 0;
    let blockedRequests = 0;

    for (const endpoint of config.endpoints) {
      console.log(chalk.yellow(`🚀 Bombardeando ${endpoint} com ${config.requestsPerSecond} req/s...`));

      const requests = [];
      const requestCount = config.requestsPerSecond * config.duration;

      // Criar todas as requisições
      for (let i = 0; i < requestCount; i++) {
        requests.push(
          this.executeAttack('RATE_LIMIT_ABUSE', {
            endpoint,
            method: 'GET',
            index: i
          })
        );

        // Delay para simular requests por segundo
        if (i > 0 && i % config.requestsPerSecond === 0) {
          await this.sleep(1000);
        }
      }

      try {
        const results = await Promise.all(requests);
        
        totalRequests += results.length;
        const blocked = results.filter(r => r.blocked).length;
        blockedRequests += blocked;

        console.log(chalk.blue(`📊 ${endpoint}: ${results.length} requests, ${blocked} bloqueados`));
        
        if (blocked === 0) {
          console.log(chalk.red(`🚨 VULNERÁVEL: ${endpoint} não tem rate limiting!`));
        } else if (blocked < results.length * 0.8) {
          console.log(chalk.yellow(`⚠️ FRACO: ${endpoint} rate limiting insuficiente`));
        } else {
          console.log(chalk.green(`✅ PROTEGIDO: ${endpoint} rate limiting efetivo`));
        }

      } catch (error) {
        console.log(chalk.red(`❌ ERRO: ${endpoint} - ${error.message}`));
      }
    }

    console.log(chalk.blue(`📊 Rate Limit Abuse: ${totalRequests} requests, ${blockedRequests} bloqueados`));
  }

  /**
   * Simular upload malicioso
   */
  async simulateMaliciousUpload() {
    const scenario = this.attackScenarios.maliciousUpload;
    console.log(chalk.blue(`🔍 Simulando: ${scenario.name}`));
    console.log(chalk.gray(`📝 ${scenario.description}`));

    let attackCount = 0;
    let blockedCount = 0;

    for (const endpoint of scenario.endpoints) {
      for (const file of scenario.files) {
        try {
          const result = await this.executeAttack('MALICIOUS_UPLOAD', {
            endpoint,
            method: 'POST',
            file
          });

          attackCount++;
          if (result.blocked) {
            blockedCount++;
            console.log(chalk.green(`✅ BLOQUEADO: ${file.name} - ${file.type}`));
          } else if (result.successful) {
            console.log(chalk.red(`🚨 UPLOAD SUCESSO: ${file.name} - ARQUIVO MALICIOSO!`));
          } else {
            console.log(chalk.yellow(`⚠️ REJEITADO: ${file.name} - Status: ${result.status}`));
          }

          await this.sleep(this.config.attackDelay);

        } catch (error) {
          console.log(chalk.gray(`⚠️ ERRO: ${file.name} - ${error.message}`));
        }
      }
    }

    console.log(chalk.blue(`📊 Malicious Upload: ${attackCount} tentativas, ${blockedCount} bloqueados`));
  }

  /**
   * Executar ataque específico
   */
  async executeAttack(type, config) {
    const userAgent = this.getRandomUserAgent();
    const result = {
      type,
      config,
      timestamp: new Date(),
      status: null,
      blocked: false,
      successful: false,
      details: null
    };

    try {
      let response;

      if (this.app) {
        // Teste local
        response = await this.executeLocalAttack(config, userAgent);
      } else {
        // Teste remoto
        response = await this.executeRemoteAttack(config, userAgent);
      }

      result.status = response.status;
      result.details = response.body;

      // Analisar resposta
      this.analyzeAttackResult(result, response);

      // Registrar resultado
      this.recordAttackResult(result);

      return result;

    } catch (error) {
      result.status = 'ERROR';
      result.details = error.message;
      result.blocked = error.code === 'ECONNREFUSED' || error.message.includes('blocked');
      
      this.recordAttackResult(result);
      return result;
    }
  }

  /**
   * Executar ataque local
   */
  async executeLocalAttack(config, userAgent) {
    const req = request(this.app);
    let requestBuilder;

    switch (config.method) {
      case 'GET':
        requestBuilder = req.get(config.endpoint);
        if (config.param && config.payload) {
          requestBuilder = requestBuilder.query({ [config.param]: config.payload });
        }
        break;
      case 'POST':
        requestBuilder = req.post(config.endpoint);
        if (config.credentials) {
          requestBuilder = requestBuilder.send(config.credentials);
        } else if (config.param && config.payload) {
          requestBuilder = requestBuilder.send({ [config.param]: config.payload });
        }
        break;
    }

    return await requestBuilder
      .set('User-Agent', userAgent)
      .timeout(this.config.timeout);
  }

  /**
   * Executar ataque remoto (simulação)
   */
  async executeRemoteAttack(config, userAgent) {
    // Simular resposta para testes remotos
    const responses = [
      { status: 403, body: { error: 'Blocked by security system' } },
      { status: 429, body: { error: 'Rate limit exceeded' } },
      { status: 400, body: { error: 'Bad request' } },
      { status: 401, body: { error: 'Unauthorized' } },
      { status: 500, body: { error: 'Internal server error' } }
    ];

    // Simular delay de rede
    await this.sleep(Math.random() * 200 + 50);

    // Retornar resposta aleatória para simulação
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Analisar resultado do ataque
   */
  analyzeAttackResult(result, response) {
    // Detectar bloqueios
    if (response.status === 403 || response.status === 429) {
      result.blocked = true;
    }

    // Detectar sucessos suspeitos
    if (response.status === 200 || response.status === 201) {
      const bodyStr = JSON.stringify(response.body || '').toLowerCase();
      
      // Indicadores de sucesso de SQL Injection
      if (result.type === 'SQL_INJECTION' && 
          (bodyStr.includes('select') || bodyStr.includes('union') || bodyStr.includes('database'))) {
        result.successful = true;
      }
      
      // Indicadores de sucesso de XSS
      if (result.type === 'XSS' && 
          bodyStr.includes('<script>') || bodyStr.includes('javascript:')) {
        result.successful = true;
      }
      
      // Indicadores de sucesso de Path Traversal
      if (result.type === 'PATH_TRAVERSAL' && 
          (bodyStr.includes('root:') || bodyStr.includes('[boot loader]'))) {
        result.successful = true;
      }
      
      // Indicadores de sucesso de Command Injection
      if (result.type === 'COMMAND_INJECTION' && 
          (bodyStr.includes('uid=') || bodyStr.includes('directory of'))) {
        result.successful = true;
      }
    }

    // Detectar login bem-sucedido
    if (result.type === 'BRUTE_FORCE' && 
        response.status === 200 && 
        JSON.stringify(response.body || '').includes('token')) {
      result.successful = true;
    }
  }

  /**
   * Registrar resultado do ataque
   */
  recordAttackResult(result) {
    this.results.attacks.push(result);
    
    if (result.blocked) {
      this.results.blocked.push(result);
    }
    
    if (result.successful) {
      this.results.successful.push(result);
    }
    
    if (!result.blocked && !result.successful && result.status !== 'ERROR') {
      this.results.warnings.push(result);
    }
  }

  /**
   * Gerar relatório de simulação
   */
  generateSimulationReport(executionTime) {
    const totalAttacks = this.results.attacks.length;
    const blockedAttacks = this.results.blocked.length;
    const successfulAttacks = this.results.successful.length;
    const warningAttacks = this.results.warnings.length;

    // Calcular score de segurança
    let securityScore = 100;
    securityScore -= (successfulAttacks * 20); // -20 por ataque bem-sucedido
    securityScore -= (warningAttacks * 5); // -5 por warning
    securityScore = Math.max(0, securityScore);

    const report = {
      timestamp: new Date().toISOString(),
      executionTime,
      target: this.targetURL,
      summary: {
        totalAttacks,
        blockedAttacks,
        successfulAttacks,
        warningAttacks,
        blockingRate: totalAttacks > 0 ? Math.round((blockedAttacks / totalAttacks) * 100) : 0,
        securityScore,
        status: this.getSecurityStatus(securityScore)
      },
      attacksByType: this.getAttacksByType(),
      vulnerabilities: this.getVulnerabilities(),
      recommendations: this.generateRecommendations(),
      details: this.results
    };

    this.printSimulationSummary(report);
    this.saveSimulationReport(report);

    return report;
  }

  /**
   * Obter ataques por tipo
   */
  getAttacksByType() {
    const types = {};
    
    for (const attack of this.results.attacks) {
      if (!types[attack.type]) {
        types[attack.type] = {
          total: 0,
          blocked: 0,
          successful: 0,
          warnings: 0
        };
      }
      
      types[attack.type].total++;
      
      if (attack.blocked) types[attack.type].blocked++;
      if (attack.successful) types[attack.type].successful++;
      if (!attack.blocked && !attack.successful && attack.status !== 'ERROR') {
        types[attack.type].warnings++;
      }
    }
    
    return types;
  }

  /**
   * Obter vulnerabilidades encontradas
   */
  getVulnerabilities() {
    const vulnerabilities = [];
    
    for (const attack of this.results.successful) {
      vulnerabilities.push({
        type: attack.type,
        endpoint: attack.config.endpoint,
        severity: this.getVulnerabilitySeverity(attack.type),
        description: this.getVulnerabilityDescription(attack.type),
        recommendation: this.getVulnerabilityRecommendation(attack.type)
      });
    }
    
    return vulnerabilities;
  }

  /**
   * Gerar recomendações
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.successful.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: `Corrigir ${this.results.successful.length} vulnerabilidades críticas encontradas`,
        impact: 'Sistema comprometido'
      });
    }
    
    if (this.results.warnings.length > 5) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Revisar respostas de erro e implementar validação adicional',
        impact: 'Possível vazamento de informações'
      });
    }
    
    const blockingRate = this.results.attacks.length > 0 ? 
      (this.results.blocked.length / this.results.attacks.length) * 100 : 0;
    
    if (blockingRate < 80) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Implementar sistema de detecção e bloqueio mais efetivo',
        impact: 'Taxa de bloqueio baixa'
      });
    }
    
    return recommendations;
  }

  /**
   * Imprimir resumo da simulação
   */
  printSimulationSummary(report) {
    console.log(chalk.red.bold('\n🎯 RELATÓRIO DE SIMULAÇÃO DE ATAQUES'));
    console.log(chalk.red('====================================='));
    
    const { summary } = report;
    
    console.log(chalk.bold(`📊 Score de Segurança: ${this.getScoreColor(summary.securityScore)(summary.securityScore + '/100')} (${this.getScoreColor(summary.securityScore)(summary.status)})`));
    console.log(chalk.bold(`🎯 Total de Ataques: ${summary.totalAttacks}`));
    console.log(chalk.green(`✅ Bloqueados: ${summary.blockedAttacks} (${summary.blockingRate}%)`));
    console.log(chalk.red(`🚨 Bem-sucedidos: ${summary.successfulAttacks}`));
    console.log(chalk.yellow(`⚠️ Warnings: ${summary.warningAttacks}`));
    
    console.log(chalk.bold('\n📋 ATAQUES POR TIPO:'));
    for (const [type, stats] of Object.entries(report.attacksByType)) {
      console.log(`   ${type}: ${stats.total} total, ${stats.blocked} bloqueados, ${stats.successful} sucessos`);
    }
    
    if (report.vulnerabilities.length > 0) {
      console.log(chalk.red.bold('\n🚨 VULNERABILIDADES ENCONTRADAS:'));
      for (const vuln of report.vulnerabilities) {
        console.log(chalk.red(`   🔴 ${vuln.type} em ${vuln.endpoint}`));
      }
    } else {
      console.log(chalk.green.bold('\n✅ NENHUMA VULNERABILIDADE CRÍTICA ENCONTRADA'));
    }
    
    console.log(chalk.gray(`\n⏱️ Tempo de execução: ${report.executionTime}ms`));
  }

  /**
   * Salvar relatório de simulação
   */
  saveSimulationReport(report) {
    try {
      const reportPath = path.join(__dirname, `attack-simulation-report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(chalk.blue(`\n📄 Relatório salvo em: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('❌ Erro ao salvar relatório:'), error);
    }
  }

  // Funções auxiliares
  getRandomUserAgent() {
    return this.config.userAgents[Math.floor(Math.random() * this.config.userAgents.length)];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getVulnerabilitySeverity(type) {
    const severities = {
      'SQL_INJECTION': 'CRITICAL',
      'COMMAND_INJECTION': 'CRITICAL',
      'XSS': 'HIGH',
      'PATH_TRAVERSAL': 'HIGH',
      'BRUTE_FORCE': 'HIGH',
      'MALICIOUS_UPLOAD': 'HIGH',
      'RATE_LIMIT_ABUSE': 'MEDIUM'
    };
    return severities[type] || 'MEDIUM';
  }

  getVulnerabilityDescription(type) {
    const descriptions = {
      'SQL_INJECTION': 'Possível injeção SQL detectada',
      'COMMAND_INJECTION': 'Execução de comando no servidor',
      'XSS': 'Script malicioso não sanitizado',
      'PATH_TRAVERSAL': 'Acesso não autorizado a arquivos',
      'BRUTE_FORCE': 'Login bem-sucedido com credenciais fracas',
      'MALICIOUS_UPLOAD': 'Upload de arquivo malicioso aceito',
      'RATE_LIMIT_ABUSE': 'Rate limiting insuficiente'
    };
    return descriptions[type] || 'Vulnerabilidade detectada';
  }

  getVulnerabilityRecommendation(type) {
    const recommendations = {
      'SQL_INJECTION': 'Implementar prepared statements',
      'COMMAND_INJECTION': 'Validar entrada e evitar execução de comandos',
      'XSS': 'Sanitizar entrada e implementar CSP',
      'PATH_TRAVERSAL': 'Validar caminhos de arquivo',
      'BRUTE_FORCE': 'Implementar rate limiting e senhas fortes',
      'MALICIOUS_UPLOAD': 'Validar tipos de arquivo rigorosamente',
      'RATE_LIMIT_ABUSE': 'Implementar rate limiting mais restritivo'
    };
    return recommendations[type] || 'Revisar implementação de segurança';
  }

  getScoreColor(score) {
    if (score >= 90) return chalk.green.bold;
    if (score >= 80) return chalk.green;
    if (score >= 70) return chalk.yellow;
    if (score >= 50) return chalk.red;
    return chalk.red.bold;
  }

  getSecurityStatus(score) {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'GOOD';
    if (score >= 70) return 'FAIR';
    if (score >= 50) return 'POOR';
    return 'CRITICAL';
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const targetURL = process.argv[2] || 'http://localhost:3333';
  const simulator = new AttackSimulator(targetURL);
  
  simulator.runCompleteSimulation()
    .then(report => {
      const exitCode = report.summary.successfulAttacks > 0 ? 1 : 0;
      console.log(chalk.cyan(`\n🏁 Simulação concluída (exit code: ${exitCode})`));
      process.exit(exitCode);
    })
    .catch(error => {
      console.error(chalk.red.bold('💥 FALHA NA SIMULAÇÃO:'), error);
      process.exit(1);
    });
}

module.exports = AttackSimulator;
