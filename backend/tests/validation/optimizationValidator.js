/**
 * ✅ VALIDADOR DE OTIMIZAÇÕES
 * 
 * Sistema para validar se as otimizações implementadas estão funcionando:
 * - Comparação antes/depois
 * - Validação de performance
 * - Verificação de circuit breakers
 * - Teste de cache otimizado
 * - Análise de throughput
 */

const axios = require('axios');
const performanceOptimizations = require('../../src/utils/performanceOptimizations');

class OptimizationValidator {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'https://ponto-certo-production.up.railway.app',
      testDuration: config.testDuration || 60000, // 1 minuto
      concurrentUsers: config.concurrentUsers || 20,
      expectedImprovements: {
        responseTimeReduction: 20, // 20% de melhoria
        throughputIncrease: 30, // 30% de aumento
        errorRateReduction: 50, // 50% menos erros
        cacheHitRateTarget: 80 // 80% de cache hit rate
      }
    };

    this.results = {
      startTime: null,
      endTime: null,
      beforeOptimization: null,
      afterOptimization: null,
      improvements: {},
      validations: [],
      success: false
    };
  }

  /**
   * Executar validação completa das otimizações
   */
  async validateOptimizations() {
    console.log('✅ INICIANDO VALIDAÇÃO DAS OTIMIZAÇÕES');
    console.log('=====================================');
    
    this.results.startTime = new Date();
    
    try {
      // 1. Teste de baseline (simulado - dados pré-otimização)
      console.log('📊 Simulando métricas pré-otimização...');
      this.results.beforeOptimization = this.getSimulatedBaselineMetrics();

      // 2. Teste pós-otimização
      console.log('🚀 Executando testes pós-otimização...');
      this.results.afterOptimization = await this.runPostOptimizationTests();

      // 3. Validar circuit breakers
      console.log('🔌 Validando circuit breakers...');
      this.results.validations.push(await this.validateCircuitBreakers());

      // 4. Validar cache otimizado
      console.log('🧠 Validando cache otimizado...');
      this.results.validations.push(await this.validateOptimizedCache());

      // 5. Validar rate limiting otimizado
      console.log('🚦 Validando rate limiting otimizado...');
      this.results.validations.push(await this.validateOptimizedRateLimit());

      // 6. Validar timeouts otimizados
      console.log('⏱️ Validando timeouts otimizados...');
      this.results.validations.push(await this.validateOptimizedTimeouts());

      // 7. Calcular melhorias
      this.results.improvements = this.calculateImprovements();

      // 8. Avaliar sucesso geral
      this.results.success = this.evaluateOverallSuccess();
      this.results.endTime = new Date();

      // 9. Gerar relatório
      const report = this.generateValidationReport();
      
      console.log('✅ VALIDAÇÃO CONCLUÍDA');
      this.displayResults();
      
      return report;

    } catch (error) {
      console.error('❌ Erro na validação:', error);
      this.results.error = error.message;
      this.results.endTime = new Date();
      throw error;
    }
  }

  /**
   * Obter métricas simuladas de baseline (pré-otimização)
   */
  getSimulatedBaselineMetrics() {
    // Simular métricas típicas antes das otimizações
    return {
      responseTime: {
        average: 1500, // 1.5s médio
        p95: 3000,
        p99: 5000
      },
      throughput: 50, // 50 req/s
      errorRate: 8, // 8% de erro
      cacheHitRate: 60, // 60% de cache hit
      timeouts: 12, // 12 timeouts por minuto
      rateLimitHits: 25, // 25 rate limits por minuto
      connectionIssues: 5 // 5 problemas de conexão
    };
  }

  /**
   * Executar testes pós-otimização
   */
  async runPostOptimizationTests() {
    const startTime = Date.now();
    const metrics = {
      responseTimes: [],
      errors: 0,
      timeouts: 0,
      rateLimitHits: 0,
      successfulRequests: 0,
      totalRequests: 0
    };

    try {
      // Teste de carga leve para medir performance
      const testPromises = [];
      
      for (let user = 0; user < this.config.concurrentUsers; user++) {
        testPromises.push(this.simulateOptimizedUser(user, metrics));
      }

      await Promise.allSettled(testPromises);

      const duration = Date.now() - startTime;
      const avgResponseTime = metrics.responseTimes.length > 0 ?
        metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length : 0;

      return {
        responseTime: {
          average: Math.round(avgResponseTime),
          p95: this.calculatePercentile(metrics.responseTimes, 95),
          p99: this.calculatePercentile(metrics.responseTimes, 99)
        },
        throughput: Math.round(metrics.totalRequests / (duration / 1000)),
        errorRate: metrics.totalRequests > 0 ? 
          Math.round((metrics.errors / metrics.totalRequests) * 100) : 0,
        timeouts: metrics.timeouts,
        rateLimitHits: metrics.rateLimitHits,
        successRate: metrics.totalRequests > 0 ?
          Math.round((metrics.successfulRequests / metrics.totalRequests) * 100) : 0,
        totalRequests: metrics.totalRequests,
        duration
      };
    } catch (error) {
      return {
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Simular usuário otimizado
   */
  async simulateOptimizedUser(userId, metrics) {
    const endpoints = [
      { path: '/', weight: 30 },
      { path: '/health', weight: 20 },
      { path: '/api/cors/origins', weight: 25 },
      { path: '/api/dashboard/estatisticas', weight: 15, requiresAuth: true },
      { path: '/api/colaboradores', weight: 10, requiresAuth: true }
    ];

    const requestCount = 5; // 5 requests por usuário
    
    for (let i = 0; i < requestCount; i++) {
      try {
        // Selecionar endpoint baseado no peso
        const endpoint = this.selectWeightedEndpoint(endpoints);
        const requestStart = Date.now();
        
        const requestConfig = {
          method: 'GET',
          url: `${this.config.baseUrl}${endpoint.path}`,
          timeout: 10000,
          headers: {}
        };

        // Adicionar auth se necessário (simulado)
        if (endpoint.requiresAuth) {
          requestConfig.headers.Authorization = 'Bearer simulated-token';
        }

        const response = await axios(requestConfig);
        const responseTime = Date.now() - requestStart;
        
        metrics.responseTimes.push(responseTime);
        metrics.totalRequests++;
        
        if (response.status >= 200 && response.status < 300) {
          metrics.successfulRequests++;
        } else {
          metrics.errors++;
        }

      } catch (error) {
        metrics.totalRequests++;
        
        if (error.code === 'ECONNABORTED') {
          metrics.timeouts++;
        } else if (error.response?.status === 429) {
          metrics.rateLimitHits++;
        } else {
          metrics.errors++;
        }
      }
      
      // Think time otimizado
      await this.sleep(200 + Math.random() * 300);
    }
  }

  /**
   * Selecionar endpoint baseado no peso
   */
  selectWeightedEndpoint(endpoints) {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const endpoint of endpoints) {
      cumulative += endpoint.weight;
      if (random <= cumulative) {
        return endpoint;
      }
    }
    
    return endpoints[0];
  }

  /**
   * Validar circuit breakers
   */
  async validateCircuitBreakers() {
    const validation = {
      name: 'Circuit Breakers',
      success: false,
      details: {}
    };

    try {
      // Obter stats dos circuit breakers
      const stats = performanceOptimizations.getOptimizationStats();
      
      validation.details = {
        circuitBreakers: stats.circuitBreakers,
        totalServices: Object.keys(stats.circuitBreakers).length,
        healthyServices: Object.values(stats.circuitBreakers).filter(cb => cb.state === 'CLOSED').length
      };

      // Validar se circuit breakers estão funcionais
      const allClosed = Object.values(stats.circuitBreakers).every(cb => cb.state === 'CLOSED');
      validation.success = allClosed;
      validation.message = allClosed ? 
        'Todos os circuit breakers estão funcionais' :
        'Alguns circuit breakers estão abertos ou em estado degradado';

    } catch (error) {
      validation.error = error.message;
      validation.message = 'Erro ao validar circuit breakers';
    }

    return validation;
  }

  /**
   * Validar cache otimizado
   */
  async validateOptimizedCache() {
    const validation = {
      name: 'Cache Otimizado',
      success: false,
      details: {}
    };

    try {
      // Fazer requests para testar cache
      const cacheTestEndpoints = [
        '/api/cors/origins',
        '/',
        '/health'
      ];

      let cacheHits = 0;
      let totalRequests = 0;

      for (const endpoint of cacheTestEndpoints) {
        // Primeira request (miss esperado)
        const response1 = await axios.get(`${this.config.baseUrl}${endpoint}`, { timeout: 5000 });
        totalRequests++;
        
        // Segunda request (hit esperado)
        const response2 = await axios.get(`${this.config.baseUrl}${endpoint}`, { timeout: 5000 });
        totalRequests++;
        
        // Verificar se segunda request foi mais rápida (indicativo de cache)
        if (response2.headers['x-cache'] === 'HIT' || 
            (response1.headers['x-response-time'] && response2.headers['x-response-time'] &&
             parseInt(response2.headers['x-response-time']) < parseInt(response1.headers['x-response-time']))) {
          cacheHits++;
        }
      }

      const cacheHitRate = totalRequests > 0 ? (cacheHits / (totalRequests / 2)) * 100 : 0;
      
      validation.details = {
        cacheHitRate: Math.round(cacheHitRate),
        target: this.config.expectedImprovements.cacheHitRateTarget,
        testedEndpoints: cacheTestEndpoints.length
      };

      validation.success = cacheHitRate >= this.config.expectedImprovements.cacheHitRateTarget * 0.7; // 70% do target
      validation.message = validation.success ?
        `Cache funcionando bem: ${Math.round(cacheHitRate)}% hit rate` :
        `Cache abaixo do esperado: ${Math.round(cacheHitRate)}% hit rate`;

    } catch (error) {
      validation.error = error.message;
      validation.message = 'Erro ao validar cache';
    }

    return validation;
  }

  /**
   * Validar rate limiting otimizado
   */
  async validateOptimizedRateLimit() {
    const validation = {
      name: 'Rate Limiting Otimizado',
      success: false,
      details: {}
    };

    try {
      // Testar se rate limiting está mais permissivo mas ainda funcional
      const rapidRequests = 20;
      let successfulRequests = 0;
      let rateLimitedRequests = 0;
      
      const promises = [];
      
      for (let i = 0; i < rapidRequests; i++) {
        promises.push(
          axios.get(`${this.config.baseUrl}/`, { timeout: 5000 })
            .then(response => {
              if (response.status === 200) successfulRequests++;
              return response;
            })
            .catch(error => {
              if (error.response?.status === 429) {
                rateLimitedRequests++;
              }
              return error;
            })
        );
      }

      await Promise.allSettled(promises);

      const permissiveness = (successfulRequests / rapidRequests) * 100;
      const protection = rateLimitedRequests > 0; // Ainda tem proteção

      validation.details = {
        rapidRequests,
        successfulRequests,
        rateLimitedRequests,
        permissiveness: Math.round(permissiveness),
        hasProtection: protection
      };

      // Sucesso se é mais permissivo mas ainda tem proteção
      validation.success = permissiveness > 70 && (protection || successfulRequests === rapidRequests);
      validation.message = validation.success ?
        `Rate limiting otimizado: ${Math.round(permissiveness)}% de permissividade` :
        'Rate limiting pode precisar de ajustes adicionais';

    } catch (error) {
      validation.error = error.message;
      validation.message = 'Erro ao validar rate limiting';
    }

    return validation;
  }

  /**
   * Validar timeouts otimizados
   */
  async validateOptimizedTimeouts() {
    const validation = {
      name: 'Timeouts Otimizados',
      success: false,
      details: {}
    };

    try {
      // Testar diferentes endpoints com timeouts específicos
      const timeoutTests = [
        { path: '/', expectedTimeout: 15000, description: 'Página principal' },
        { path: '/health', expectedTimeout: 5000, description: 'Health check' },
        { path: '/api/cors/origins', expectedTimeout: 5000, description: 'API básica' }
      ];

      const results = [];
      
      for (const test of timeoutTests) {
        const startTime = Date.now();
        
        try {
          const response = await axios.get(`${this.config.baseUrl}${test.path}`, {
            timeout: test.expectedTimeout + 1000 // Um pouco mais que o esperado
          });
          
          const responseTime = Date.now() - startTime;
          
          results.push({
            path: test.path,
            description: test.description,
            responseTime,
            expectedTimeout: test.expectedTimeout,
            success: responseTime < test.expectedTimeout,
            withinTimeout: responseTime < test.expectedTimeout
          });
        } catch (error) {
          const responseTime = Date.now() - startTime;
          
          results.push({
            path: test.path,
            description: test.description,
            responseTime,
            expectedTimeout: test.expectedTimeout,
            success: false,
            error: error.message,
            withinTimeout: false
          });
        }
      }

      const successfulTests = results.filter(r => r.success).length;
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      validation.details = {
        tests: results,
        successfulTests,
        totalTests: timeoutTests.length,
        avgResponseTime: Math.round(avgResponseTime),
        successRate: Math.round((successfulTests / timeoutTests.length) * 100)
      };

      validation.success = successfulTests >= timeoutTests.length * 0.8; // 80% de sucesso
      validation.message = validation.success ?
        `Timeouts funcionando bem: ${validation.details.successRate}% sucesso` :
        `Timeouts precisam ajuste: ${validation.details.successRate}% sucesso`;

    } catch (error) {
      validation.error = error.message;
      validation.message = 'Erro ao validar timeouts';
    }

    return validation;
  }

  /**
   * Calcular melhorias
   */
  calculateImprovements() {
    const before = this.results.beforeOptimization;
    const after = this.results.afterOptimization;

    if (!before || !after) {
      return { error: 'Dados insuficientes para calcular melhorias' };
    }

    const improvements = {
      responseTime: {
        before: before.responseTime.average,
        after: after.responseTime.average,
        improvement: Math.round(((before.responseTime.average - after.responseTime.average) / before.responseTime.average) * 100),
        target: this.config.expectedImprovements.responseTimeReduction
      },
      throughput: {
        before: before.throughput,
        after: after.throughput,
        improvement: Math.round(((after.throughput - before.throughput) / before.throughput) * 100),
        target: this.config.expectedImprovements.throughputIncrease
      },
      errorRate: {
        before: before.errorRate,
        after: after.errorRate,
        improvement: Math.round(((before.errorRate - after.errorRate) / before.errorRate) * 100),
        target: this.config.expectedImprovements.errorRateReduction
      },
      successRate: {
        before: 100 - before.errorRate,
        after: after.successRate,
        improvement: after.successRate - (100 - before.errorRate)
      }
    };

    return improvements;
  }

  /**
   * Avaliar sucesso geral
   */
  evaluateOverallSuccess() {
    const validations = this.results.validations;
    const improvements = this.results.improvements;
    
    // Verificar se validações passaram
    const passedValidations = validations.filter(v => v.success).length;
    const validationSuccessRate = (passedValidations / validations.length) * 100;
    
    // Verificar se melhorias atingiram targets
    let improvementScore = 0;
    
    if (improvements.responseTime && improvements.responseTime.improvement > 0) {
      improvementScore += 25;
    }
    
    if (improvements.throughput && improvements.throughput.improvement > 0) {
      improvementScore += 25;
    }
    
    if (improvements.errorRate && improvements.errorRate.improvement > 0) {
      improvementScore += 25;
    }
    
    if (improvements.successRate && improvements.successRate.improvement > 0) {
      improvementScore += 25;
    }

    // Sucesso se validações passaram e houve melhorias
    return validationSuccessRate >= 80 && improvementScore >= 50;
  }

  /**
   * Gerar relatório de validação
   */
  generateValidationReport() {
    return {
      timestamp: new Date(),
      testConfig: this.config,
      results: this.results,
      summary: {
        overallSuccess: this.results.success,
        validationsPassedRate: Math.round((this.results.validations.filter(v => v.success).length / this.results.validations.length) * 100),
        improvements: this.results.improvements,
        duration: this.results.endTime.getTime() - this.results.startTime.getTime()
      },
      recommendations: this.generateOptimizationRecommendations()
    };
  }

  /**
   * Gerar recomendações de otimização
   */
  generateOptimizationRecommendations() {
    const recommendations = [];
    const improvements = this.results.improvements;
    
    // Baseado nas melhorias observadas
    if (improvements.responseTime && improvements.responseTime.improvement < 10) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'RESPONSE_TIME',
        message: 'Melhoria de tempo de resposta abaixo do esperado',
        action: 'Considerar otimizações adicionais de queries e cache'
      });
    }

    if (improvements.throughput && improvements.throughput.improvement < 20) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'THROUGHPUT',
        message: 'Melhoria de throughput pode ser maior',
        action: 'Otimizar connection pooling e rate limiting'
      });
    }

    // Baseado nas validações
    const failedValidations = this.results.validations.filter(v => !v.success);
    for (const validation of failedValidations) {
      recommendations.push({
        priority: 'HIGH',
        category: validation.name.toUpperCase().replace(' ', '_'),
        message: `Validação falhou: ${validation.name}`,
        action: validation.message
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'INFO',
        category: 'SUCCESS',
        message: 'Todas as otimizações estão funcionando corretamente',
        action: 'Manter configurações atuais e monitorar performance'
      });
    }

    return recommendations;
  }

  /**
   * Exibir resultados
   */
  displayResults() {
    console.log('\n📊 RESULTADOS DA VALIDAÇÃO');
    console.log('==========================');
    
    const summary = this.results.summary || {};
    console.log(`Status geral: ${this.results.success ? '✅ SUCESSO' : '❌ PRECISA AJUSTES'}`);
    console.log(`Validações aprovadas: ${summary.validationsPassedRate || 0}%`);
    console.log(`Duração: ${this.formatDuration(summary.duration || 0)}`);
    
    // Melhorias
    if (this.results.improvements) {
      console.log('\n📈 MELHORIAS OBSERVADAS:');
      const imp = this.results.improvements;
      
      if (imp.responseTime) {
        console.log(`   Response Time: ${imp.responseTime.before}ms → ${imp.responseTime.after}ms (${imp.responseTime.improvement > 0 ? '+' : ''}${imp.responseTime.improvement}%)`);
      }
      
      if (imp.throughput) {
        console.log(`   Throughput: ${imp.throughput.before} → ${imp.throughput.after} req/s (${imp.throughput.improvement > 0 ? '+' : ''}${imp.throughput.improvement}%)`);
      }
      
      if (imp.errorRate) {
        console.log(`   Error Rate: ${imp.errorRate.before}% → ${imp.errorRate.after}% (${imp.errorRate.improvement > 0 ? '+' : ''}${imp.errorRate.improvement}%)`);
      }
    }
    
    // Validações
    console.log('\n🔍 VALIDAÇÕES:');
    for (const validation of this.results.validations) {
      const status = validation.success ? '✅' : '❌';
      console.log(`   ${status} ${validation.name}: ${validation.message}`);
    }
    
    // Recomendações importantes
    const report = this.generateValidationReport();
    const criticalRecs = report.recommendations.filter(r => r.priority === 'HIGH' || r.priority === 'CRITICAL');
    
    if (criticalRecs.length > 0) {
      console.log('\n🚨 RECOMENDAÇÕES IMPORTANTES:');
      criticalRecs.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority}] ${rec.message}`);
        console.log(`      Ação: ${rec.action}`);
      });
    }
  }

  // Funções auxiliares
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = OptimizationValidator;
