/**
 * 🚀 FRAMEWORK DE TESTES DE STRESS
 * 
 * Sistema completo de testes de stress e carga com:
 * - Testes de carga progressiva
 * - Testes de stress de memória
 * - Testes de concorrência
 * - Testes de picos de tráfego
 * - Monitoramento em tempo real
 * - Relatórios detalhados de performance
 */

const EventEmitter = require('events');
const axios = require('axios');
const cluster = require('cluster');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');

class StressTestFramework extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:8080',
      maxConcurrentUsers: config.maxConcurrentUsers || 1000,
      testDuration: config.testDuration || 300000, // 5 minutos
      rampUpTime: config.rampUpTime || 60000, // 1 minuto
      rampDownTime: config.rampDownTime || 30000, // 30 segundos
      requestTimeout: config.requestTimeout || 10000, // 10 segundos
      thinkTime: config.thinkTime || 1000, // 1 segundo entre requests
      enableMonitoring: config.enableMonitoring !== false,
      reportInterval: config.reportInterval || 10000, // 10 segundos
      memoryThreshold: config.memoryThreshold || 1024 * 1024 * 1024, // 1GB
      cpuThreshold: config.cpuThreshold || 80 // 80%
    };

    // Estado do teste
    this.testState = {
      isRunning: false,
      startTime: null,
      endTime: null,
      activeUsers: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      errors: new Map(),
      responseTimes: [],
      throughput: 0
    };

    // Métricas de sistema
    this.systemMetrics = {
      cpu: [],
      memory: [],
      heap: [],
      handles: [],
      connections: []
    };

    // Cenários de teste
    this.testScenarios = new Map();
    
    // Workers para testes distribuídos
    this.workers = [];
    
    this.initialize();
  }

  /**
   * Inicializar framework
   */
  initialize() {
    this.loadTestScenarios();
    this.setupMonitoring();
    console.log('🚀 Stress Test Framework inicializado');
  }

  /**
   * Carregar cenários de teste
   */
  loadTestScenarios() {
    const scenarios = [
      {
        id: 'authentication_stress',
        name: 'Stress de Autenticação',
        description: 'Testa múltiplos logins simultâneos',
        weight: 30, // 30% do tráfego
        requests: [
          {
            method: 'POST',
            path: '/api/auth/login-admin',
            body: () => ({
              email: 'admin@fgservices.com',
              senha: 'admin123'
            }),
            expectedStatus: 200
          }
        ]
      },
      {
        id: 'dashboard_stress',
        name: 'Stress do Dashboard',
        description: 'Testa carregamento do dashboard',
        weight: 25,
        requiresAuth: true,
        requests: [
          {
            method: 'GET',
            path: '/api/dashboard/estatisticas',
            expectedStatus: 200
          },
          {
            method: 'GET',
            path: '/api/dashboard/registros-recentes',
            expectedStatus: 200
          },
          {
            method: 'GET',
            path: '/api/dashboard/alertas',
            expectedStatus: 200
          }
        ]
      },
      {
        id: 'point_registration_stress',
        name: 'Stress de Registro de Ponto',
        description: 'Testa registros simultâneos de ponto',
        weight: 20,
        requiresAuth: true,
        requests: [
          {
            method: 'POST',
            path: '/api/ponto/registrar',
            body: () => ({
              colaborador_id: Math.floor(Math.random() * 100) + 1,
              latitude: -23.550520 + (Math.random() - 0.5) * 0.01,
              longitude: -46.633308 + (Math.random() - 0.5) * 0.01,
              tablet_id: `TABLET-${Math.floor(Math.random() * 10) + 1}`,
              tablet_name: `Totem ${Math.floor(Math.random() * 10) + 1}`
            }),
            expectedStatus: 201
          }
        ]
      },
      {
        id: 'reports_stress',
        name: 'Stress de Relatórios',
        description: 'Testa geração de relatórios',
        weight: 15,
        requiresAuth: true,
        requests: [
          {
            method: 'GET',
            path: '/api/ponto/relatorio',
            query: () => ({
              data_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              data_fim: new Date().toISOString().split('T')[0]
            }),
            expectedStatus: 200
          }
        ]
      },
      {
        id: 'face_recognition_stress',
        name: 'Stress de Reconhecimento Facial',
        description: 'Testa reconhecimento facial simultâneo',
        weight: 10,
        requests: [
          {
            method: 'POST',
            path: '/api/face/recognize',
            body: () => ({
              image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
              colaborador_id: Math.floor(Math.random() * 100) + 1
            }),
            expectedStatus: [200, 404] // 404 se colaborador não existe
          }
        ]
      }
    ];

    scenarios.forEach(scenario => {
      this.testScenarios.set(scenario.id, scenario);
    });

    console.log(`📋 ${this.testScenarios.size} cenários de teste carregados`);
  }

  /**
   * Configurar monitoramento
   */
  setupMonitoring() {
    if (!this.config.enableMonitoring) return;

    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000); // A cada 5 segundos
  }

  /**
   * Coletar métricas do sistema
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.systemMetrics.memory.push({
      timestamp: Date.now(),
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external
    });

    this.systemMetrics.cpu.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system
    });

    // Manter apenas últimas 1000 métricas
    if (this.systemMetrics.memory.length > 1000) {
      this.systemMetrics.memory.shift();
    }
    if (this.systemMetrics.cpu.length > 1000) {
      this.systemMetrics.cpu.shift();
    }
  }

  /**
   * Executar teste de stress completo
   */
  async runStressTest(testConfig = {}) {
    const config = { ...this.config, ...testConfig };
    const testId = this.generateTestId();
    
    console.log(`🚀 INICIANDO TESTE DE STRESS [${testId}]`);
    console.log(`📊 Configuração: ${config.maxConcurrentUsers} usuários, ${config.testDuration/1000}s duração`);
    
    try {
      // Inicializar estado do teste
      this.initializeTestState(testId, config);
      
      // Preparar usuários de teste
      const testUsers = await this.prepareTestUsers(config.maxConcurrentUsers);
      
      // Executar teste
      const results = await this.executeStressTest(testUsers, config);
      
      // Gerar relatório
      const report = await this.generateStressReport(testId, results, config);
      
      console.log(`✅ TESTE CONCLUÍDO [${testId}] - Sucesso: ${results.success}`);
      
      return report;
      
    } catch (error) {
      console.error(`❌ ERRO NO TESTE [${testId}]:`, error);
      throw error;
    } finally {
      this.cleanupTest();
    }
  }

  /**
   * Inicializar estado do teste
   */
  initializeTestState(testId, config) {
    this.testState = {
      testId,
      isRunning: true,
      startTime: Date.now(),
      endTime: null,
      activeUsers: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      errors: new Map(),
      responseTimes: [],
      throughput: 0,
      config
    };

    this.systemMetrics = {
      cpu: [],
      memory: [],
      heap: [],
      handles: [],
      connections: []
    };
  }

  /**
   * Preparar usuários de teste
   */
  async prepareTestUsers(userCount) {
    const users = [];
    
    // Criar tokens de teste para diferentes tipos de usuários
    const userTypes = [
      { profile: 'ADMINISTRADOR', weight: 10 },
      { profile: 'RH', weight: 20 },
      { profile: 'GESTOR', weight: 30 },
      { profile: 'COLABORADOR', weight: 40 }
    ];

    for (let i = 0; i < userCount; i++) {
      // Selecionar tipo de usuário baseado no peso
      const random = Math.random() * 100;
      let cumulative = 0;
      let selectedType = userTypes[0];
      
      for (const type of userTypes) {
        cumulative += type.weight;
        if (random <= cumulative) {
          selectedType = type;
          break;
        }
      }

      // Gerar token de teste
      const token = jwt.sign(
        {
          id: i + 1,
          email: `test_user_${i}@test.com`,
          perfil: selectedType.profile
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '2h' }
      );

      users.push({
        id: i + 1,
        profile: selectedType.profile,
        token,
        requestCount: 0,
        errors: 0,
        avgResponseTime: 0
      });
    }

    console.log(`👥 ${users.length} usuários de teste preparados`);
    return users;
  }

  /**
   * Executar teste de stress
   */
  async executeStressTest(testUsers, config) {
    const results = {
      success: false,
      phases: {},
      metrics: {},
      errors: []
    };

    try {
      // Fase 1: Ramp-up (aumento gradual de carga)
      console.log('📈 Fase 1: Ramp-up');
      results.phases.rampUp = await this.executeRampUp(testUsers, config);

      // Fase 2: Sustain (carga sustentada)
      console.log('🔥 Fase 2: Carga sustentada');
      results.phases.sustain = await this.executeSustainedLoad(testUsers, config);

      // Fase 3: Peak (pico de carga)
      console.log('⛰️ Fase 3: Pico de carga');
      results.phases.peak = await this.executePeakLoad(testUsers, config);

      // Fase 4: Ramp-down (redução gradual)
      console.log('📉 Fase 4: Ramp-down');
      results.phases.rampDown = await this.executeRampDown(testUsers, config);

      // Calcular métricas finais
      results.metrics = this.calculateFinalMetrics();
      results.success = this.evaluateTestSuccess(results);

      return results;
    } catch (error) {
      results.error = error.message;
      results.metrics = this.calculateFinalMetrics();
      return results;
    }
  }

  /**
   * Executar fase de ramp-up
   */
  async executeRampUp(testUsers, config) {
    const startTime = Date.now();
    const rampUpUsers = Math.floor(config.maxConcurrentUsers * 0.3); // 30% dos usuários
    const activeUsers = testUsers.slice(0, rampUpUsers);
    
    console.log(`📈 Ramp-up: ${rampUpUsers} usuários por ${config.rampUpTime/1000}s`);
    
    // Iniciar usuários gradualmente
    const userBatches = this.createUserBatches(activeUsers, 10); // 10 usuários por batch
    const batchInterval = config.rampUpTime / userBatches.length;
    
    const promises = [];
    
    for (let i = 0; i < userBatches.length; i++) {
      setTimeout(() => {
        const batch = userBatches[i];
        for (const user of batch) {
          promises.push(this.simulateUser(user, config.rampUpTime - (i * batchInterval)));
        }
      }, i * batchInterval);
    }

    // Aguardar conclusão do ramp-up
    await new Promise(resolve => setTimeout(resolve, config.rampUpTime));
    
    return {
      duration: Date.now() - startTime,
      activeUsers: rampUpUsers,
      requests: this.testState.totalRequests,
      avgResponseTime: this.calculateAverageResponseTime(),
      errorRate: this.calculateErrorRate()
    };
  }

  /**
   * Executar carga sustentada
   */
  async executeSustainedLoad(testUsers, config) {
    const startTime = Date.now();
    const sustainUsers = Math.floor(config.maxConcurrentUsers * 0.7); // 70% dos usuários
    const activeUsers = testUsers.slice(0, sustainUsers);
    
    console.log(`🔥 Carga sustentada: ${sustainUsers} usuários por ${config.testDuration/1000}s`);
    
    // Executar carga sustentada
    const promises = activeUsers.map(user => 
      this.simulateUser(user, config.testDuration)
    );
    
    // Monitorar durante execução
    const monitoringPromise = this.monitorDuringTest(config.testDuration);
    
    // Aguardar conclusão
    await Promise.all([...promises, monitoringPromise]);
    
    return {
      duration: Date.now() - startTime,
      activeUsers: sustainUsers,
      requests: this.testState.totalRequests,
      avgResponseTime: this.calculateAverageResponseTime(),
      errorRate: this.calculateErrorRate(),
      throughput: this.calculateThroughput(config.testDuration)
    };
  }

  /**
   * Executar pico de carga
   */
  async executePeakLoad(testUsers, config) {
    const startTime = Date.now();
    const peakDuration = 60000; // 1 minuto de pico
    const peakUsers = config.maxConcurrentUsers; // 100% dos usuários
    
    console.log(`⛰️ Pico de carga: ${peakUsers} usuários por ${peakDuration/1000}s`);
    
    // Todos os usuários ativos simultaneamente
    const promises = testUsers.map(user => 
      this.simulateUser(user, peakDuration, { highIntensity: true })
    );
    
    // Monitoramento intensivo
    const intensiveMonitoring = this.monitorDuringTest(peakDuration, { intensive: true });
    
    await Promise.all([...promises, intensiveMonitoring]);
    
    return {
      duration: Date.now() - startTime,
      activeUsers: peakUsers,
      requests: this.testState.totalRequests,
      avgResponseTime: this.calculateAverageResponseTime(),
      errorRate: this.calculateErrorRate(),
      peakThroughput: this.calculateThroughput(peakDuration)
    };
  }

  /**
   * Executar ramp-down
   */
  async executeRampDown(testUsers, config) {
    const startTime = Date.now();
    
    console.log(`📉 Ramp-down: ${config.rampDownTime/1000}s`);
    
    // Reduzir usuários gradualmente
    const rampDownUsers = Math.floor(config.maxConcurrentUsers * 0.1); // 10% dos usuários
    const activeUsers = testUsers.slice(0, rampDownUsers);
    
    const promises = activeUsers.map(user => 
      this.simulateUser(user, config.rampDownTime)
    );
    
    await Promise.all(promises);
    
    return {
      duration: Date.now() - startTime,
      activeUsers: rampDownUsers,
      requests: this.testState.totalRequests,
      finalMetrics: this.calculateFinalMetrics()
    };
  }

  /**
   * Simular usuário
   */
  async simulateUser(user, duration, options = {}) {
    const endTime = Date.now() + duration;
    const thinkTime = options.highIntensity ? 
      this.config.thinkTime / 2 : this.config.thinkTime;
    
    while (Date.now() < endTime && this.testState.isRunning) {
      try {
        // Selecionar cenário baseado no peso
        const scenario = this.selectScenario();
        
        // Executar requests do cenário
        for (const request of scenario.requests) {
          await this.executeRequest(user, scenario, request);
          
          // Think time entre requests
          if (Date.now() < endTime) {
            await this.sleep(thinkTime + Math.random() * thinkTime);
          }
        }
      } catch (error) {
        this.recordError(error, user);
      }
    }
  }

  /**
   * Selecionar cenário baseado no peso
   */
  selectScenario() {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const scenario of this.testScenarios.values()) {
      cumulative += scenario.weight;
      if (random <= cumulative) {
        return scenario;
      }
    }
    
    // Fallback para primeiro cenário
    return this.testScenarios.values().next().value;
  }

  /**
   * Executar request
   */
  async executeRequest(user, scenario, request) {
    const startTime = Date.now();
    
    try {
      this.testState.totalRequests++;
      
      // Preparar configuração da request
      const requestConfig = {
        method: request.method,
        url: `${this.config.baseUrl}${request.path}`,
        timeout: this.config.requestTimeout,
        headers: {}
      };

      // Adicionar autenticação se necessário
      if (scenario.requiresAuth || request.requiresAuth) {
        requestConfig.headers.Authorization = `Bearer ${user.token}`;
      }

      // Adicionar body se necessário
      if (request.body) {
        requestConfig.data = typeof request.body === 'function' ? 
          request.body() : request.body;
      }

      // Adicionar query parameters
      if (request.query) {
        const queryParams = typeof request.query === 'function' ? 
          request.query() : request.query;
        requestConfig.params = queryParams;
      }

      // Executar request
      const response = await axios(requestConfig);
      const responseTime = Date.now() - startTime;
      
      // Verificar status esperado
      const expectedStatuses = Array.isArray(request.expectedStatus) ? 
        request.expectedStatus : [request.expectedStatus];
      
      if (expectedStatuses.includes(response.status)) {
        this.testState.successfulRequests++;
        this.recordResponseTime(responseTime);
        user.requestCount++;
      } else {
        this.testState.failedRequests++;
        this.recordError(`Unexpected status: ${response.status}`, user);
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.testState.failedRequests++;
      this.recordError(error, user);
      this.recordResponseTime(responseTime); // Ainda registrar tempo para análise
    }
  }

  /**
   * Monitorar durante teste
   */
  async monitorDuringTest(duration, options = {}) {
    const interval = options.intensive ? 1000 : 5000; // 1s ou 5s
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime && this.testState.isRunning) {
      this.collectSystemMetrics();
      
      // Verificar thresholds críticos
      const currentMemory = process.memoryUsage().heapUsed;
      if (currentMemory > this.config.memoryThreshold) {
        console.warn(`⚠️ Uso de memória crítico: ${Math.round(currentMemory / 1024 / 1024)}MB`);
        this.emit('memory_threshold_exceeded', { memory: currentMemory });
      }

      // Emitir métricas em tempo real
      if (options.intensive) {
        this.emit('real_time_metrics', {
          activeUsers: this.testState.activeUsers,
          totalRequests: this.testState.totalRequests,
          errorRate: this.calculateErrorRate(),
          avgResponseTime: this.calculateAverageResponseTime(),
          throughput: this.calculateCurrentThroughput()
        });
      }

      await this.sleep(interval);
    }
  }

  /**
   * Executar teste de carga específico
   */
  async runLoadTest(endpoint, config = {}) {
    const testConfig = {
      endpoint,
      concurrentUsers: config.concurrentUsers || 100,
      requestsPerUser: config.requestsPerUser || 50,
      rampUpTime: config.rampUpTime || 30000,
      method: config.method || 'GET',
      payload: config.payload,
      headers: config.headers || {}
    };

    console.log(`🎯 Teste de carga: ${endpoint}`);
    
    const startTime = Date.now();
    const results = {
      endpoint,
      startTime: new Date(startTime),
      requests: [],
      errors: [],
      metrics: {}
    };

    try {
      // Preparar usuários
      const users = Array.from({ length: testConfig.concurrentUsers }, (_, i) => ({
        id: i + 1,
        requestCount: 0,
        errors: 0
      }));

      // Executar requests concorrentes
      const promises = users.map(async (user, index) => {
        // Ramp-up gradual
        await this.sleep((index / users.length) * testConfig.rampUpTime);
        
        // Executar requests do usuário
        for (let i = 0; i < testConfig.requestsPerUser; i++) {
          try {
            const requestStart = Date.now();
            
            const response = await axios({
              method: testConfig.method,
              url: `${this.config.baseUrl}${endpoint}`,
              data: testConfig.payload,
              headers: testConfig.headers,
              timeout: this.config.requestTimeout
            });

            const responseTime = Date.now() - requestStart;
            
            results.requests.push({
              userId: user.id,
              responseTime,
              status: response.status,
              success: response.status >= 200 && response.status < 300,
              timestamp: new Date(requestStart)
            });

            user.requestCount++;
            
          } catch (error) {
            results.errors.push({
              userId: user.id,
              error: error.message,
              timestamp: new Date()
            });
            user.errors++;
          }

          // Think time
          await this.sleep(Math.random() * 1000 + 500);
        }
      });

      await Promise.all(promises);

      // Calcular métricas
      const totalRequests = results.requests.length;
      const successfulRequests = results.requests.filter(r => r.success).length;
      const avgResponseTime = results.requests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests;
      const maxResponseTime = Math.max(...results.requests.map(r => r.responseTime));
      const minResponseTime = Math.min(...results.requests.map(r => r.responseTime));

      results.metrics = {
        totalRequests,
        successfulRequests,
        failedRequests: results.errors.length,
        successRate: Math.round((successfulRequests / totalRequests) * 100),
        avgResponseTime: Math.round(avgResponseTime),
        maxResponseTime,
        minResponseTime,
        throughput: Math.round(totalRequests / ((Date.now() - startTime) / 1000)),
        duration: Date.now() - startTime
      };

      console.log(`📊 Teste concluído: ${results.metrics.successRate}% sucesso, ${results.metrics.avgResponseTime}ms avg`);
      
      return results;
    } catch (error) {
      results.error = error.message;
      return results;
    }
  }

  /**
   * Executar teste de stress de memória
   */
  async runMemoryStressTest(config = {}) {
    const testConfig = {
      maxMemoryMB: config.maxMemoryMB || 512,
      allocationStepMB: config.allocationStepMB || 10,
      holdTime: config.holdTime || 30000, // 30 segundos
      releaseGradual: config.releaseGradual !== false
    };

    console.log(`🧠 Teste de stress de memória: até ${testConfig.maxMemoryMB}MB`);
    
    const startTime = Date.now();
    const allocatedBlocks = [];
    let currentMemoryMB = 0;
    
    try {
      // Alocar memória gradualmente
      while (currentMemoryMB < testConfig.maxMemoryMB) {
        const blockSize = testConfig.allocationStepMB * 1024 * 1024; // MB para bytes
        const block = Buffer.alloc(blockSize);
        allocatedBlocks.push(block);
        currentMemoryMB += testConfig.allocationStepMB;
        
        // Monitorar uso de memória
        const memUsage = process.memoryUsage();
        console.log(`💾 Alocado: ${currentMemoryMB}MB, Heap: ${Math.round(memUsage.heapUsed/1024/1024)}MB`);
        
        // Verificar se sistema ainda responde
        try {
          await this.testSystemResponsiveness();
        } catch (error) {
          console.warn(`⚠️ Sistema não responsivo com ${currentMemoryMB}MB alocados`);
          break;
        }
        
        await this.sleep(1000); // 1 segundo entre alocações
      }

      // Manter memória alocada
      console.log(`⏱️ Mantendo ${currentMemoryMB}MB por ${testConfig.holdTime/1000}s`);
      await this.sleep(testConfig.holdTime);

      // Liberar memória
      if (testConfig.releaseGradual) {
        console.log('📉 Liberando memória gradualmente...');
        while (allocatedBlocks.length > 0) {
          allocatedBlocks.pop();
          currentMemoryMB -= testConfig.allocationStepMB;
          
          if (global.gc) {
            global.gc();
          }
          
          await this.sleep(500);
        }
      } else {
        console.log('💨 Liberando toda a memória...');
        allocatedBlocks.length = 0;
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemUsage = process.memoryUsage();
      
      return {
        success: true,
        maxAllocatedMB: currentMemoryMB,
        duration: Date.now() - startTime,
        finalMemoryUsage: {
          heapUsed: Math.round(finalMemUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(finalMemUsage.heapTotal / 1024 / 1024),
          rss: Math.round(finalMemUsage.rss / 1024 / 1024)
        }
      };
    } catch (error) {
      // Liberar memória em caso de erro
      allocatedBlocks.length = 0;
      if (global.gc) {
        global.gc();
      }
      
      return {
        success: false,
        error: error.message,
        maxAllocatedMB: currentMemoryMB,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Testar responsividade do sistema
   */
  async testSystemResponsiveness() {
    const timeout = 5000; // 5 segundos
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Sistema não responsivo'));
      }, timeout);

      // Teste simples de responsividade
      setImmediate(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /**
   * Executar teste de concorrência
   */
  async runConcurrencyTest(config = {}) {
    const testConfig = {
      concurrentOperations: config.concurrentOperations || 50,
      operationType: config.operationType || 'database_write',
      duration: config.duration || 60000 // 1 minuto
    };

    console.log(`🔀 Teste de concorrência: ${testConfig.concurrentOperations} operações simultâneas`);
    
    const startTime = Date.now();
    const operations = [];
    
    try {
      // Criar operações concorrentes
      for (let i = 0; i < testConfig.concurrentOperations; i++) {
        operations.push(this.executeConcurrentOperation(i, testConfig));
      }

      // Executar todas simultaneamente
      const results = await Promise.allSettled(operations);
      
      // Analisar resultados
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return {
        success: failed === 0,
        totalOperations: testConfig.concurrentOperations,
        successful,
        failed,
        successRate: Math.round((successful / testConfig.concurrentOperations) * 100),
        duration: Date.now() - startTime,
        errors: results
          .filter(r => r.status === 'rejected')
          .map(r => r.reason.message)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Executar operação concorrente
   */
  async executeConcurrentOperation(operationId, config) {
    const db = require('../../src/config/database');
    
    try {
      switch (config.operationType) {
        case 'database_write':
          // Simular inserção no banco
          await db.query(`
            INSERT INTO test_concurrency (operation_id, timestamp, data)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
          `, [operationId, new Date(), JSON.stringify({ test: true })]);
          break;
          
        case 'database_read':
          // Simular leitura do banco
          await db.query('SELECT COUNT(*) FROM colaboradores');
          break;
          
        case 'file_operation':
          // Simular operação de arquivo
          const tempFile = path.join(__dirname, `temp_${operationId}.txt`);
          await fs.writeFile(tempFile, `Test data ${operationId}`);
          await fs.readFile(tempFile);
          await fs.unlink(tempFile);
          break;
          
        default:
          throw new Error(`Tipo de operação desconhecido: ${config.operationType}`);
      }
      
      return { operationId, success: true };
    } catch (error) {
      throw new Error(`Operação ${operationId} falhou: ${error.message}`);
    }
  }

  /**
   * Criar batches de usuários
   */
  createUserBatches(users, batchSize) {
    const batches = [];
    for (let i = 0; i < users.length; i += batchSize) {
      batches.push(users.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Registrar tempo de resposta
   */
  recordResponseTime(time) {
    this.testState.responseTimes.push(time);
    
    // Manter apenas últimos 10000 tempos
    if (this.testState.responseTimes.length > 10000) {
      this.testState.responseTimes.shift();
    }
  }

  /**
   * Registrar erro
   */
  recordError(error, user) {
    const errorKey = error.message || error.toString();
    const count = this.testState.errors.get(errorKey) || 0;
    this.testState.errors.set(errorKey, count + 1);
    
    if (user) {
      user.errors++;
    }
  }

  /**
   * Calcular métricas finais
   */
  calculateFinalMetrics() {
    const totalRequests = this.testState.totalRequests;
    const successRate = totalRequests > 0 ? 
      Math.round((this.testState.successfulRequests / totalRequests) * 100) : 0;
    
    const responseTimes = this.testState.responseTimes;
    const avgResponseTime = responseTimes.length > 0 ?
      Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
    
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;

    return {
      requests: {
        total: totalRequests,
        successful: this.testState.successfulRequests,
        failed: this.testState.failedRequests,
        successRate
      },
      responseTime: {
        average: avgResponseTime,
        min: Math.min(...responseTimes) || 0,
        max: Math.max(...responseTimes) || 0,
        p95,
        p99
      },
      errors: Object.fromEntries(this.testState.errors),
      system: this.calculateSystemMetrics()
    };
  }

  /**
   * Calcular métricas do sistema
   */
  calculateSystemMetrics() {
    if (this.systemMetrics.memory.length === 0) {
      return {};
    }

    const memoryValues = this.systemMetrics.memory.map(m => m.heapUsed);
    const maxMemory = Math.max(...memoryValues);
    const avgMemory = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;

    return {
      memory: {
        max: Math.round(maxMemory / 1024 / 1024), // MB
        average: Math.round(avgMemory / 1024 / 1024), // MB
        samples: this.systemMetrics.memory.length
      },
      cpu: {
        samples: this.systemMetrics.cpu.length
      }
    };
  }

  /**
   * Avaliar sucesso do teste
   */
  evaluateTestSuccess(results) {
    // Critérios de sucesso
    const successCriteria = {
      minSuccessRate: 95, // 95% de sucesso
      maxAvgResponseTime: 2000, // 2 segundos
      maxErrorRate: 5 // 5% de erro
    };

    const metrics = results.metrics;
    const successRate = metrics.requests?.successRate || 0;
    const avgResponseTime = metrics.responseTime?.average || 0;
    const errorRate = 100 - successRate;

    return successRate >= successCriteria.minSuccessRate &&
           avgResponseTime <= successCriteria.maxAvgResponseTime &&
           errorRate <= successCriteria.maxErrorRate;
  }

  /**
   * Gerar relatório de stress
   */
  async generateStressReport(testId, results, config) {
    const report = {
      testId,
      timestamp: new Date(),
      config,
      results,
      summary: this.generateTestSummary(results),
      recommendations: this.generateRecommendations(results),
      systemMetrics: this.systemMetrics
    };

    // Salvar relatório
    const reportPath = await this.saveStressReport(report);
    report.reportPath = reportPath;

    return report;
  }

  /**
   * Gerar resumo do teste
   */
  generateTestSummary(results) {
    return {
      overallSuccess: results.success,
      totalDuration: this.testState.endTime - this.testState.startTime,
      peakConcurrentUsers: this.config.maxConcurrentUsers,
      totalRequests: this.testState.totalRequests,
      successRate: this.calculateErrorRate(),
      avgResponseTime: this.calculateAverageResponseTime(),
      peakThroughput: results.phases?.peak?.peakThroughput || 0,
      systemStability: this.evaluateSystemStability()
    };
  }

  /**
   * Gerar recomendações
   */
  generateRecommendations(results) {
    const recommendations = [];
    const metrics = results.metrics;

    if (metrics.requests?.successRate < 95) {
      recommendations.push({
        priority: 'HIGH',
        category: 'RELIABILITY',
        message: `Taxa de sucesso baixa: ${metrics.requests.successRate}%`,
        action: 'Investigar e corrigir erros mais frequentes'
      });
    }

    if (metrics.responseTime?.average > 2000) {
      recommendations.push({
        priority: 'HIGH',
        category: 'PERFORMANCE',
        message: `Tempo de resposta alto: ${metrics.responseTime.average}ms`,
        action: 'Otimizar queries e adicionar cache'
      });
    }

    if (metrics.responseTime?.p99 > 5000) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'PERFORMANCE',
        message: `P99 muito alto: ${metrics.responseTime.p99}ms`,
        action: 'Otimizar queries mais lentas'
      });
    }

    return recommendations;
  }

  /**
   * Salvar relatório de stress
   */
  async saveStressReport(report) {
    try {
      const reportsDir = path.join(__dirname, '../reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const filename = `stress-test-${report.testId}-${Date.now()}.json`;
      const reportPath = path.join(reportsDir, filename);
      
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`📄 Relatório salvo: ${reportPath}`);
      return reportPath;
    } catch (error) {
      console.error('❌ Erro ao salvar relatório:', error);
      throw error;
    }
  }

  /**
   * Limpar teste
   */
  cleanupTest() {
    this.testState.isRunning = false;
    this.testState.endTime = Date.now();
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Forçar garbage collection se disponível
    if (global.gc) {
      global.gc();
    }
  }

  // Funções auxiliares
  generateTestId() {
    return `STRESS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  calculateAverageResponseTime() {
    const times = this.testState.responseTimes;
    return times.length > 0 ? 
      Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  }

  calculateErrorRate() {
    const total = this.testState.totalRequests;
    return total > 0 ? 
      Math.round((this.testState.failedRequests / total) * 100) : 0;
  }

  calculateThroughput(duration) {
    return Math.round(this.testState.totalRequests / (duration / 1000));
  }

  calculateCurrentThroughput() {
    const elapsed = Date.now() - this.testState.startTime;
    return Math.round(this.testState.totalRequests / (elapsed / 1000));
  }

  evaluateSystemStability() {
    // Avaliar estabilidade baseada em métricas coletadas
    const memoryGrowth = this.calculateMemoryGrowth();
    const errorTrend = this.calculateErrorTrend();
    
    if (memoryGrowth > 50 || errorTrend > 10) {
      return 'UNSTABLE';
    } else if (memoryGrowth > 20 || errorTrend > 5) {
      return 'DEGRADED';
    } else {
      return 'STABLE';
    }
  }

  calculateMemoryGrowth() {
    if (this.systemMetrics.memory.length < 2) return 0;
    
    const first = this.systemMetrics.memory[0].heapUsed;
    const last = this.systemMetrics.memory[this.systemMetrics.memory.length - 1].heapUsed;
    
    return Math.round(((last - first) / first) * 100);
  }

  calculateErrorTrend() {
    // Calcular tendência de erros (simplificado)
    return this.calculateErrorRate();
  }

  /**
   * Obter estatísticas atuais
   */
  getStats() {
    return {
      testState: this.testState,
      systemMetrics: this.systemMetrics,
      config: this.config
    };
  }
}

module.exports = StressTestFramework;
