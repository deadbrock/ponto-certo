/**
 * 🌐 TESTES DE STRESS DAS APIS
 * 
 * Testes especializados para avaliar limites das APIs:
 * - Stress de endpoints críticos
 * - Stress de autenticação
 * - Stress de upload de arquivos
 * - Stress de geração de relatórios
 * - Monitoramento de rate limiting
 * - Testes de timeout e circuit breaker
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const StressTestFramework = require('./stressTestFramework');

class APIStressTest extends StressTestFramework {
  constructor(config = {}) {
    super(config);
    
    this.apiConfig = {
      baseUrl: config.baseUrl || 'http://localhost:8080/api',
      maxRequestsPerSecond: config.maxRequestsPerSecond || 100,
      timeoutThreshold: config.timeoutThreshold || 10000,
      rateLimitThreshold: config.rateLimitThreshold || 1000,
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      enableRateLimitTesting: config.enableRateLimitTesting !== false
    };

    this.apiMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      timeoutRequests: 0,
      rateLimitedRequests: 0,
      authFailures: 0,
      endpointMetrics: new Map()
    };

    // Endpoints críticos para teste
    this.criticalEndpoints = [
      {
        path: '/auth/login-admin',
        method: 'POST',
        category: 'authentication',
        priority: 'CRITICAL',
        expectedLoad: 50, // requests por minuto esperado
        payload: {
          email: 'admin@fgservices.com',
          senha: 'admin123'
        }
      },
      {
        path: '/dashboard/estatisticas',
        method: 'GET',
        category: 'dashboard',
        priority: 'HIGH',
        expectedLoad: 200,
        requiresAuth: true
      },
      {
        path: '/colaboradores',
        method: 'GET',
        category: 'data_access',
        priority: 'HIGH',
        expectedLoad: 150,
        requiresAuth: true
      },
      {
        path: '/ponto/registrar',
        method: 'POST',
        category: 'core_functionality',
        priority: 'CRITICAL',
        expectedLoad: 300,
        requiresAuth: true,
        payload: () => ({
          colaborador_id: Math.floor(Math.random() * 100) + 1,
          latitude: -23.550520,
          longitude: -46.633308,
          tablet_id: 'STRESS-TEST-TABLET'
        })
      },
      {
        path: '/ponto/relatorio',
        method: 'GET',
        category: 'reports',
        priority: 'MEDIUM',
        expectedLoad: 20,
        requiresAuth: true,
        query: {
          data_inicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          data_fim: new Date().toISOString().split('T')[0]
        }
      },
      {
        path: '/face/recognize',
        method: 'POST',
        category: 'biometric',
        priority: 'CRITICAL',
        expectedLoad: 100,
        payload: {
          image: this.generateTestImage(),
          colaborador_id: 1
        }
      }
    ];
  }

  /**
   * Executar teste completo de stress das APIs
   */
  async runAPIStressTest() {
    const testId = this.generateTestId();
    console.log(`🌐 INICIANDO TESTE DE STRESS DAS APIS [${testId}]`);
    
    try {
      const results = {
        testId,
        startTime: new Date(),
        tests: {},
        endpointResults: {},
        metrics: {},
        success: false
      };

      // Preparar tokens de autenticação
      const authTokens = await this.prepareAuthTokens();

      // Teste 1: Stress individual por endpoint
      console.log('🎯 Teste 1: Stress individual por endpoint');
      results.tests.endpointStress = await this.testEndpointStress(authTokens);

      // Teste 2: Stress de autenticação
      console.log('🔐 Teste 2: Stress de autenticação');
      results.tests.authStress = await this.testAuthenticationStress();

      // Teste 3: Stress de rate limiting
      console.log('🚦 Teste 3: Stress de rate limiting');
      results.tests.rateLimitStress = await this.testRateLimitStress(authTokens);

      // Teste 4: Stress de upload
      console.log('📤 Teste 4: Stress de upload de arquivos');
      results.tests.uploadStress = await this.testUploadStress(authTokens);

      // Teste 5: Stress de relatórios
      console.log('📊 Teste 5: Stress de geração de relatórios');
      results.tests.reportStress = await this.testReportStress(authTokens);

      // Teste 6: Stress misto (todos os endpoints)
      console.log('🌪️ Teste 6: Stress misto');
      results.tests.mixedStress = await this.testMixedEndpointStress(authTokens);

      // Calcular métricas finais
      results.metrics = this.calculateAPIMetrics();
      results.success = this.evaluateAPITestSuccess(results);
      results.endTime = new Date();

      return results;

    } catch (error) {
      console.error(`❌ Erro no teste de stress das APIs [${testId}]:`, error);
      throw error;
    }
  }

  /**
   * Preparar tokens de autenticação
   */
  async prepareAuthTokens() {
    const tokens = {};
    
    const userProfiles = ['ADMINISTRADOR', 'RH', 'GESTOR', 'COLABORADOR'];
    
    for (const profile of userProfiles) {
      tokens[profile] = jwt.sign(
        {
          id: Math.floor(Math.random() * 1000),
          email: `stress_${profile.toLowerCase()}@test.com`,
          perfil: profile
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '2h' }
      );
    }

    console.log(`🔑 ${Object.keys(tokens).length} tokens de autenticação preparados`);
    return tokens;
  }

  /**
   * Teste de stress por endpoint
   */
  async testEndpointStress(authTokens) {
    const results = {};
    
    for (const endpoint of this.criticalEndpoints) {
      console.log(`🎯 Testando endpoint: ${endpoint.method} ${endpoint.path}`);
      
      const endpointResult = await this.stressTestEndpoint(endpoint, authTokens);
      results[endpoint.path] = endpointResult;
      
      // Pequena pausa entre testes de endpoints
      await this.sleep(2000);
    }

    return results;
  }

  /**
   * Teste de stress de um endpoint específico
   */
  async stressTestEndpoint(endpoint, authTokens) {
    const startTime = Date.now();
    const concurrentRequests = Math.min(endpoint.expectedLoad, 50); // Máximo 50 concurrent
    const requestsPerUser = 10;
    
    try {
      const requestPromises = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        requestPromises.push(
          this.executeEndpointRequests(endpoint, authTokens, requestsPerUser, i)
        );
      }

      const requestResults = await Promise.allSettled(requestPromises);
      const successfulThreads = requestResults.filter(r => r.status === 'fulfilled').length;
      
      // Agregar resultados
      let totalRequests = 0;
      let successfulRequests = 0;
      let responseTimes = [];
      let errors = [];

      for (const result of requestResults) {
        if (result.status === 'fulfilled') {
          const threadData = result.value;
          totalRequests += threadData.totalRequests;
          successfulRequests += threadData.successfulRequests;
          responseTimes.push(...threadData.responseTimes);
          errors.push(...threadData.errors);
        }
      }

      const avgResponseTime = responseTimes.length > 0 ?
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

      // Atualizar métricas do endpoint
      this.updateEndpointMetrics(endpoint.path, {
        totalRequests,
        successfulRequests,
        avgResponseTime,
        errors: errors.length
      });

      return {
        endpoint: endpoint.path,
        success: successfulThreads >= concurrentRequests * 0.9,
        concurrentRequests,
        successfulThreads,
        totalRequests,
        successfulRequests,
        requestSuccessRate: Math.round((successfulRequests / totalRequests) * 100),
        avgResponseTime: Math.round(avgResponseTime),
        maxResponseTime: Math.max(...responseTimes, 0),
        errors: errors.length,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        endpoint: endpoint.path,
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Executar requests para um endpoint
   */
  async executeEndpointRequests(endpoint, authTokens, requestCount, threadId) {
    const responseTimes = [];
    const errors = [];
    let successfulRequests = 0;

    try {
      for (let i = 0; i < requestCount; i++) {
        const requestStart = Date.now();
        
        try {
          // Preparar configuração da request
          const requestConfig = {
            method: endpoint.method,
            url: `${this.apiConfig.baseUrl}${endpoint.path}`,
            timeout: this.apiConfig.timeoutThreshold
          };

          // Adicionar autenticação se necessário
          if (endpoint.requiresAuth) {
            const token = authTokens.ADMINISTRADOR; // Usar admin por padrão
            requestConfig.headers = {
              'Authorization': `Bearer ${token}`
            };
          }

          // Adicionar payload
          if (endpoint.payload) {
            requestConfig.data = typeof endpoint.payload === 'function' ?
              endpoint.payload() : endpoint.payload;
          }

          // Adicionar query parameters
          if (endpoint.query) {
            requestConfig.params = endpoint.query;
          }

          // Executar request
          const response = await axios(requestConfig);
          const responseTime = Date.now() - requestStart;
          
          responseTimes.push(responseTime);
          successfulRequests++;
          
          this.apiMetrics.totalRequests++;
          this.apiMetrics.successfulRequests++;
          
        } catch (error) {
          const responseTime = Date.now() - requestStart;
          responseTimes.push(responseTime);
          errors.push({
            request: i,
            error: error.message,
            status: error.response?.status,
            responseTime
          });
          
          this.apiMetrics.totalRequests++;
          
          // Categorizar erro
          if (error.code === 'ECONNABORTED') {
            this.apiMetrics.timeoutRequests++;
          } else if (error.response?.status === 429) {
            this.apiMetrics.rateLimitedRequests++;
          } else if (error.response?.status === 401 || error.response?.status === 403) {
            this.apiMetrics.authFailures++;
          }
        }
        
        // Think time
        await this.sleep(Math.random() * 200 + 100);
      }

      return {
        threadId,
        totalRequests: requestCount,
        successfulRequests,
        responseTimes,
        errors
      };
    } catch (error) {
      throw new Error(`Thread ${threadId} falhou: ${error.message}`);
    }
  }

  /**
   * Teste de stress de autenticação
   */
  async testAuthenticationStress() {
    const startTime = Date.now();
    const concurrentLogins = 100;
    const loginsPerUser = 5;
    
    console.log(`🔐 Testando ${concurrentLogins} logins simultâneos...`);
    
    try {
      // Criar usuários de teste únicos
      const testCredentials = Array.from({ length: concurrentLogins }, (_, i) => ({
        email: `stress_user_${i}@test.com`,
        senha: 'test123456'
      }));

      const loginPromises = testCredentials.map(async (creds, index) => {
        const userResults = {
          userId: index,
          attempts: 0,
          successful: 0,
          failed: 0,
          responseTimes: []
        };

        for (let attempt = 0; attempt < loginsPerUser; attempt++) {
          const requestStart = Date.now();
          
          try {
            const response = await axios.post(`${this.apiConfig.baseUrl}/auth/login-admin`, {
              email: 'admin@fgservices.com', // Usar admin real para teste
              senha: 'admin123'
            }, {
              timeout: this.apiConfig.timeoutThreshold
            });

            const responseTime = Date.now() - requestStart;
            userResults.responseTimes.push(responseTime);
            userResults.attempts++;
            
            if (response.status === 200 && response.data.token) {
              userResults.successful++;
            } else {
              userResults.failed++;
            }
          } catch (error) {
            const responseTime = Date.now() - requestStart;
            userResults.responseTimes.push(responseTime);
            userResults.attempts++;
            userResults.failed++;
          }
          
          // Pausa entre tentativas
          await this.sleep(Math.random() * 1000 + 500);
        }

        return userResults;
      });

      const loginResults = await Promise.allSettled(loginPromises);
      const successfulUsers = loginResults.filter(r => r.status === 'fulfilled').length;
      
      // Agregar resultados
      let totalAttempts = 0;
      let totalSuccessful = 0;
      let allResponseTimes = [];

      for (const result of loginResults) {
        if (result.status === 'fulfilled') {
          const userData = result.value;
          totalAttempts += userData.attempts;
          totalSuccessful += userData.successful;
          allResponseTimes.push(...userData.responseTimes);
        }
      }

      const avgResponseTime = allResponseTimes.length > 0 ?
        allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length : 0;

      return {
        success: successfulUsers >= concurrentLogins * 0.9,
        concurrentUsers: concurrentLogins,
        successfulUsers,
        totalAttempts,
        successfulLogins: totalSuccessful,
        loginSuccessRate: Math.round((totalSuccessful / totalAttempts) * 100),
        avgResponseTime: Math.round(avgResponseTime),
        duration: Date.now() - startTime
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
   * Teste de stress de rate limiting
   */
  async testRateLimitStress(authTokens) {
    const startTime = Date.now();
    const requestsToTriggerLimit = 200; // Tentar disparar rate limit
    const concurrentClients = 5;
    
    console.log(`🚦 Testando rate limiting com ${requestsToTriggerLimit} requests...`);
    
    try {
      const clientPromises = [];
      
      for (let client = 0; client < concurrentClients; client++) {
        clientPromises.push(
          this.executeRateLimitTest(client, requestsToTriggerLimit / concurrentClients, authTokens.ADMINISTRADOR)
        );
      }

      const clientResults = await Promise.allSettled(clientPromises);
      const successfulClients = clientResults.filter(r => r.status === 'fulfilled').length;
      
      // Agregar resultados
      let totalRequests = 0;
      let rateLimitedRequests = 0;
      let successfulRequests = 0;

      for (const result of clientResults) {
        if (result.status === 'fulfilled') {
          const clientData = result.value;
          totalRequests += clientData.totalRequests;
          rateLimitedRequests += clientData.rateLimitedRequests;
          successfulRequests += clientData.successfulRequests;
        }
      }

      const rateLimitTriggered = rateLimitedRequests > 0;
      const rateLimitEffectiveness = rateLimitedRequests / totalRequests;

      return {
        success: rateLimitTriggered, // Sucesso = rate limit funcionando
        concurrentClients,
        successfulClients,
        totalRequests,
        rateLimitedRequests,
        successfulRequests,
        rateLimitTriggered,
        rateLimitEffectiveness: Math.round(rateLimitEffectiveness * 100),
        duration: Date.now() - startTime
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
   * Executar teste de rate limit
   */
  async executeRateLimitTest(clientId, requestCount, authToken) {
    let totalRequests = 0;
    let rateLimitedRequests = 0;
    let successfulRequests = 0;

    try {
      for (let i = 0; i < requestCount; i++) {
        try {
          const response = await axios.get(`${this.apiConfig.baseUrl}/dashboard/estatisticas`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            timeout: 5000
          });

          totalRequests++;
          
          if (response.status === 429) {
            rateLimitedRequests++;
          } else if (response.status === 200) {
            successfulRequests++;
          }
        } catch (error) {
          totalRequests++;
          
          if (error.response?.status === 429) {
            rateLimitedRequests++;
          }
        }
        
        // Requests rápidos para tentar disparar rate limit
        await this.sleep(10);
      }

      return {
        clientId,
        totalRequests,
        rateLimitedRequests,
        successfulRequests
      };
    } catch (error) {
      throw new Error(`Cliente ${clientId} falhou: ${error.message}`);
    }
  }

  /**
   * Teste de stress de upload
   */
  async testUploadStress(authTokens) {
    const startTime = Date.now();
    const concurrentUploads = 10;
    const uploadsPerUser = 3;
    
    console.log(`📤 Testando ${concurrentUploads * uploadsPerUser} uploads simultâneos...`);
    
    try {
      const uploadPromises = [];
      
      for (let i = 0; i < concurrentUploads; i++) {
        uploadPromises.push(
          this.executeUploadTest(i, uploadsPerUser, authTokens.ADMINISTRADOR)
        );
      }

      const uploadResults = await Promise.allSettled(uploadPromises);
      const successfulUsers = uploadResults.filter(r => r.status === 'fulfilled').length;
      
      // Agregar resultados
      let totalUploads = 0;
      let successfulUploads = 0;
      let uploadErrors = [];

      for (const result of uploadResults) {
        if (result.status === 'fulfilled') {
          const userData = result.value;
          totalUploads += userData.totalUploads;
          successfulUploads += userData.successfulUploads;
          uploadErrors.push(...userData.errors);
        }
      }

      return {
        success: successfulUsers >= concurrentUploads * 0.8,
        concurrentUsers: concurrentUploads,
        successfulUsers,
        totalUploads,
        successfulUploads,
        uploadSuccessRate: Math.round((successfulUploads / totalUploads) * 100),
        errors: uploadErrors.length,
        duration: Date.now() - startTime
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
   * Executar teste de upload
   */
  async executeUploadTest(userId, uploadCount, authToken) {
    let totalUploads = 0;
    let successfulUploads = 0;
    const errors = [];

    try {
      for (let i = 0; i < uploadCount; i++) {
        try {
          // Criar arquivo de teste
          const testFile = this.createTestFile(`test-upload-${userId}-${i}.jpg`);
          
          const formData = new FormData();
          formData.append('face', fs.createReadStream(testFile));
          formData.append('colaborador_id', '1');

          const response = await axios.post(`${this.apiConfig.baseUrl}/primeiro-registro/face`, formData, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              ...formData.getHeaders()
            },
            timeout: 30000, // 30 segundos para upload
            maxContentLength: this.apiConfig.maxFileSize
          });

          totalUploads++;
          
          if (response.status >= 200 && response.status < 300) {
            successfulUploads++;
          }
          
          // Limpar arquivo de teste
          try {
            await fs.unlink(testFile);
          } catch (cleanupError) {
            console.warn('⚠️ Erro ao limpar arquivo:', cleanupError);
          }
        } catch (error) {
          totalUploads++;
          errors.push({
            upload: i,
            error: error.message,
            status: error.response?.status
          });
        }
        
        await this.sleep(Math.random() * 1000 + 500);
      }

      return {
        userId,
        totalUploads,
        successfulUploads,
        errors
      };
    } catch (error) {
      throw new Error(`Upload test ${userId} falhou: ${error.message}`);
    }
  }

  /**
   * Criar arquivo de teste
   */
  createTestFile(filename) {
    const testDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const filePath = path.join(testDir, filename);
    
    // Criar arquivo de imagem fake (JPEG header + dados aleatórios)
    const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    const randomData = Buffer.alloc(1024 * 50); // 50KB
    crypto.randomFillSync(randomData);
    
    const fileData = Buffer.concat([jpegHeader, randomData]);
    fs.writeFileSync(filePath, fileData);
    
    return filePath;
  }

  /**
   * Teste de stress de relatórios
   */
  async testReportStress(authTokens) {
    const startTime = Date.now();
    const concurrentReports = 15;
    const reportsPerUser = 3;
    
    console.log(`📊 Testando ${concurrentReports * reportsPerUser} relatórios simultâneos...`);
    
    try {
      const reportTypes = [
        {
          path: '/ponto/relatorio',
          params: {
            data_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            data_fim: new Date().toISOString().split('T')[0]
          }
        },
        {
          path: '/ponto/relatorio-afd',
          params: {
            data_inicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            data_fim: new Date().toISOString().split('T')[0]
          }
        },
        {
          path: '/analytics/registros-por-hora',
          params: {}
        }
      ];

      const reportPromises = [];
      
      for (let i = 0; i < concurrentReports; i++) {
        reportPromises.push(
          this.executeReportTest(i, reportsPerUser, reportTypes, authTokens.RH)
        );
      }

      const reportResults = await Promise.allSettled(reportPromises);
      const successfulUsers = reportResults.filter(r => r.status === 'fulfilled').length;
      
      // Agregar resultados
      let totalReports = 0;
      let successfulReports = 0;
      let reportTimes = [];

      for (const result of reportResults) {
        if (result.status === 'fulfilled') {
          const userData = result.value;
          totalReports += userData.totalReports;
          successfulReports += userData.successfulReports;
          reportTimes.push(...userData.reportTimes);
        }
      }

      const avgReportTime = reportTimes.length > 0 ?
        reportTimes.reduce((a, b) => a + b, 0) / reportTimes.length : 0;

      return {
        success: successfulUsers >= concurrentReports * 0.8,
        concurrentUsers: concurrentReports,
        successfulUsers,
        totalReports,
        successfulReports,
        reportSuccessRate: Math.round((successfulReports / totalReports) * 100),
        avgReportTime: Math.round(avgReportTime),
        maxReportTime: Math.max(...reportTimes, 0),
        duration: Date.now() - startTime
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
   * Executar teste de relatório
   */
  async executeReportTest(userId, reportCount, reportTypes, authToken) {
    let totalReports = 0;
    let successfulReports = 0;
    const reportTimes = [];

    try {
      for (let i = 0; i < reportCount; i++) {
        // Selecionar tipo de relatório aleatório
        const reportType = reportTypes[Math.floor(Math.random() * reportTypes.length)];
        
        const reportStart = Date.now();
        
        try {
          const response = await axios.get(`${this.apiConfig.baseUrl}${reportType.path}`, {
            params: reportType.params,
            headers: { 'Authorization': `Bearer ${authToken}` },
            timeout: 60000 // 1 minuto para relatórios
          });

          const reportTime = Date.now() - reportStart;
          reportTimes.push(reportTime);
          totalReports++;
          
          if (response.status === 200) {
            successfulReports++;
          }
        } catch (error) {
          const reportTime = Date.now() - reportStart;
          reportTimes.push(reportTime);
          totalReports++;
        }
        
        // Pausa entre relatórios
        await this.sleep(Math.random() * 2000 + 1000);
      }

      return {
        userId,
        totalReports,
        successfulReports,
        reportTimes
      };
    } catch (error) {
      throw new Error(`Report test ${userId} falhou: ${error.message}`);
    }
  }

  /**
   * Teste de stress misto
   */
  async testMixedEndpointStress(authTokens) {
    const startTime = Date.now();
    const duration = 120000; // 2 minutos
    const concurrentUsers = 50;
    
    console.log(`🌪️ Testando carga mista por ${duration/1000}s com ${concurrentUsers} usuários...`);
    
    try {
      const userPromises = [];
      
      for (let i = 0; i < concurrentUsers; i++) {
        const userProfile = ['ADMINISTRADOR', 'RH', 'GESTOR', 'COLABORADOR'][i % 4];
        const authToken = authTokens[userProfile];
        
        userPromises.push(
          this.executeMixedUserTest(i, duration, authToken, userProfile)
        );
      }

      const userResults = await Promise.allSettled(userPromises);
      const successfulUsers = userResults.filter(r => r.status === 'fulfilled').length;
      
      // Agregar todas as métricas
      let totalRequests = 0;
      let successfulRequests = 0;
      let allResponseTimes = [];
      const endpointStats = new Map();

      for (const result of userResults) {
        if (result.status === 'fulfilled') {
          const userData = result.value;
          totalRequests += userData.totalRequests;
          successfulRequests += userData.successfulRequests;
          allResponseTimes.push(...userData.responseTimes);
          
          // Agregar stats por endpoint
          for (const [endpoint, stats] of userData.endpointStats) {
            if (!endpointStats.has(endpoint)) {
              endpointStats.set(endpoint, { requests: 0, successful: 0, avgTime: 0 });
            }
            const current = endpointStats.get(endpoint);
            current.requests += stats.requests;
            current.successful += stats.successful;
            current.avgTime = (current.avgTime + stats.avgTime) / 2;
          }
        }
      }

      const avgResponseTime = allResponseTimes.length > 0 ?
        allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length : 0;

      const throughput = Math.round(totalRequests / (duration / 1000));

      return {
        success: successfulUsers >= concurrentUsers * 0.9,
        duration: duration,
        concurrentUsers,
        successfulUsers,
        totalRequests,
        successfulRequests,
        requestSuccessRate: Math.round((successfulRequests / totalRequests) * 100),
        avgResponseTime: Math.round(avgResponseTime),
        throughput,
        endpointStats: Object.fromEntries(endpointStats),
        actualDuration: Date.now() - startTime
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
   * Executar teste misto de usuário
   */
  async executeMixedUserTest(userId, duration, authToken, userProfile) {
    const endTime = Date.now() + duration;
    let totalRequests = 0;
    let successfulRequests = 0;
    const responseTimes = [];
    const endpointStats = new Map();

    // Selecionar endpoints baseado no perfil
    const allowedEndpoints = this.getEndpointsForProfile(userProfile);

    try {
      while (Date.now() < endTime) {
        // Selecionar endpoint aleatório
        const endpoint = allowedEndpoints[Math.floor(Math.random() * allowedEndpoints.length)];
        
        const requestStart = Date.now();
        
        try {
          const requestConfig = {
            method: endpoint.method,
            url: `${this.apiConfig.baseUrl}${endpoint.path}`,
            headers: { 'Authorization': `Bearer ${authToken}` },
            timeout: 10000
          };

          if (endpoint.payload) {
            requestConfig.data = typeof endpoint.payload === 'function' ?
              endpoint.payload() : endpoint.payload;
          }

          if (endpoint.query) {
            requestConfig.params = endpoint.query;
          }

          const response = await axios(requestConfig);
          const responseTime = Date.now() - requestStart;
          
          responseTimes.push(responseTime);
          totalRequests++;
          
          if (response.status >= 200 && response.status < 300) {
            successfulRequests++;
          }

          // Atualizar stats do endpoint
          this.updateEndpointStatsMap(endpointStats, endpoint.path, responseTime, true);
          
        } catch (error) {
          const responseTime = Date.now() - requestStart;
          responseTimes.push(responseTime);
          totalRequests++;
          
          this.updateEndpointStatsMap(endpointStats, endpoint.path, responseTime, false);
        }
        
        // Think time baseado no perfil
        const thinkTime = this.getThinkTimeForProfile(userProfile);
        await this.sleep(thinkTime);
      }

      return {
        userId,
        userProfile,
        totalRequests,
        successfulRequests,
        responseTimes,
        endpointStats
      };
    } catch (error) {
      throw new Error(`Mixed test ${userId} falhou: ${error.message}`);
    }
  }

  /**
   * Obter endpoints permitidos por perfil
   */
  getEndpointsForProfile(profile) {
    const profileEndpoints = {
      'ADMINISTRADOR': this.criticalEndpoints,
      'RH': this.criticalEndpoints.filter(e => 
        ['dashboard', 'data_access', 'reports'].includes(e.category)
      ),
      'GESTOR': this.criticalEndpoints.filter(e => 
        ['dashboard', 'data_access'].includes(e.category)
      ),
      'COLABORADOR': this.criticalEndpoints.filter(e => 
        ['core_functionality', 'biometric'].includes(e.category)
      )
    };

    return profileEndpoints[profile] || [];
  }

  /**
   * Obter think time por perfil
   */
  getThinkTimeForProfile(profile) {
    const thinkTimes = {
      'ADMINISTRADOR': 2000, // 2 segundos
      'RH': 3000, // 3 segundos
      'GESTOR': 4000, // 4 segundos
      'COLABORADOR': 5000 // 5 segundos
    };

    return thinkTimes[profile] || 3000;
  }

  /**
   * Atualizar estatísticas do endpoint
   */
  updateEndpointMetrics(endpoint, metrics) {
    if (!this.apiMetrics.endpointMetrics.has(endpoint)) {
      this.apiMetrics.endpointMetrics.set(endpoint, {
        totalRequests: 0,
        successfulRequests: 0,
        totalResponseTime: 0,
        errors: 0
      });
    }

    const current = this.apiMetrics.endpointMetrics.get(endpoint);
    current.totalRequests += metrics.totalRequests;
    current.successfulRequests += metrics.successfulRequests;
    current.totalResponseTime += metrics.avgResponseTime * metrics.totalRequests;
    current.errors += metrics.errors;
  }

  /**
   * Atualizar mapa de stats do endpoint
   */
  updateEndpointStatsMap(statsMap, endpoint, responseTime, success) {
    if (!statsMap.has(endpoint)) {
      statsMap.set(endpoint, {
        requests: 0,
        successful: 0,
        totalTime: 0,
        avgTime: 0
      });
    }

    const stats = statsMap.get(endpoint);
    stats.requests++;
    if (success) stats.successful++;
    stats.totalTime += responseTime;
    stats.avgTime = stats.totalTime / stats.requests;
  }

  /**
   * Calcular métricas das APIs
   */
  calculateAPIMetrics() {
    const endpointMetrics = {};
    
    for (const [endpoint, metrics] of this.apiMetrics.endpointMetrics) {
      endpointMetrics[endpoint] = {
        ...metrics,
        successRate: Math.round((metrics.successfulRequests / metrics.totalRequests) * 100),
        avgResponseTime: Math.round(metrics.totalResponseTime / metrics.totalRequests)
      };
    }

    return {
      overall: {
        totalRequests: this.apiMetrics.totalRequests,
        successfulRequests: this.apiMetrics.successfulRequests,
        timeoutRequests: this.apiMetrics.timeoutRequests,
        rateLimitedRequests: this.apiMetrics.rateLimitedRequests,
        authFailures: this.apiMetrics.authFailures,
        overallSuccessRate: Math.round((this.apiMetrics.successfulRequests / this.apiMetrics.totalRequests) * 100)
      },
      endpoints: endpointMetrics
    };
  }

  /**
   * Avaliar sucesso do teste de API
   */
  evaluateAPITestSuccess(results) {
    const tests = Object.values(results.tests);
    const passedTests = tests.filter(test => test.success).length;
    const passRate = Math.round((passedTests / tests.length) * 100);
    
    // Critérios específicos para APIs
    const metrics = results.metrics;
    const overallSuccessRate = metrics.overall?.overallSuccessRate || 0;
    
    return passRate >= 80 && overallSuccessRate >= 95;
  }

  /**
   * Gerar imagem de teste
   */
  generateTestImage() {
    // Base64 de uma imagem JPEG mínima válida
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
  }
}

module.exports = APIStressTest;
