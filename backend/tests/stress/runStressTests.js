/**
 * 🚀 EXECUTOR DE TESTES DE STRESS COMPLETOS
 * 
 * Script principal para executar todos os testes de stress do sistema:
 * - Testes de carga das APIs
 * - Testes de stress do banco de dados
 * - Testes de stress de memória
 * - Testes de concorrência
 * - Monitoramento em tempo real
 * - Relatórios consolidados
 */

const path = require('path');
const fs = require('fs').promises;
const StressTestFramework = require('./stressTestFramework');
const DatabaseStressTest = require('./databaseStressTest');
const APIStressTest = require('./apiStressTest');

class StressTestRunner {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:8080',
      runDatabaseTests: config.runDatabaseTests !== false,
      runAPITests: config.runAPITests !== false,
      runMemoryTests: config.runMemoryTests !== false,
      runConcurrencyTests: config.runConcurrencyTests !== false,
      runLoadTests: config.runLoadTests !== false,
      maxConcurrentUsers: config.maxConcurrentUsers || 500,
      testDuration: config.testDuration || 300000, // 5 minutos
      reportFormat: config.reportFormat || 'both', // json, text, both
      outputDir: config.outputDir || path.join(__dirname, '../reports/stress')
    };

    this.results = {
      testSuite: 'Complete Stress Test Suite',
      startTime: null,
      endTime: null,
      tests: {},
      summary: {},
      recommendations: [],
      systemInfo: {}
    };
  }

  /**
   * Executar suite completa de testes de stress
   */
  async runCompleteStressTestSuite() {
    console.log('🚀 INICIANDO SUITE COMPLETA DE TESTES DE STRESS');
    console.log('================================================');
    
    this.results.startTime = new Date();
    
    try {
      // Coletar informações do sistema
      this.results.systemInfo = await this.collectSystemInfo();
      console.log(`🖥️ Sistema: ${this.results.systemInfo.platform} ${this.results.systemInfo.arch}`);
      console.log(`💾 Memória: ${this.results.systemInfo.totalMemory}GB`);
      console.log(`🔧 CPUs: ${this.results.systemInfo.cpuCount}`);
      console.log('');

      // Verificar conectividade
      await this.verifySystemConnectivity();

      // Executar testes de stress do banco de dados
      if (this.config.runDatabaseTests) {
        console.log('🗄️ EXECUTANDO TESTES DE STRESS DO BANCO DE DADOS');
        console.log('================================================');
        this.results.tests.database = await this.runDatabaseStressTests();
        console.log('');
      }

      // Executar testes de stress das APIs
      if (this.config.runAPITests) {
        console.log('🌐 EXECUTANDO TESTES DE STRESS DAS APIS');
        console.log('======================================');
        this.results.tests.api = await this.runAPIStressTests();
        console.log('');
      }

      // Executar testes de stress de memória
      if (this.config.runMemoryTests) {
        console.log('🧠 EXECUTANDO TESTES DE STRESS DE MEMÓRIA');
        console.log('=========================================');
        this.results.tests.memory = await this.runMemoryStressTests();
        console.log('');
      }

      // Executar testes de concorrência
      if (this.config.runConcurrencyTests) {
        console.log('🔀 EXECUTANDO TESTES DE CONCORRÊNCIA');
        console.log('===================================');
        this.results.tests.concurrency = await this.runConcurrencyTests();
        console.log('');
      }

      // Executar testes de carga
      if (this.config.runLoadTests) {
        console.log('📈 EXECUTANDO TESTES DE CARGA');
        console.log('=============================');
        this.results.tests.load = await this.runLoadTests();
        console.log('');
      }

      // Calcular resumo final
      this.results.endTime = new Date();
      this.results.summary = this.calculateOverallSummary();
      this.results.recommendations = this.generateOverallRecommendations();

      // Gerar relatórios
      await this.generateReports();

      // Exibir resultados
      this.displayResults();

      return this.results;

    } catch (error) {
      console.error('❌ Erro na execução dos testes:', error);
      this.results.error = error.message;
      this.results.endTime = new Date();
      throw error;
    }
  }

  /**
   * Coletar informações do sistema
   */
  async collectSystemInfo() {
    const os = require('os');
    
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpuCount: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024), // GB
      uptime: Math.round(os.uptime() / 3600), // horas
      loadAverage: os.loadavg(),
      hostname: os.hostname()
    };
  }

  /**
   * Verificar conectividade do sistema
   */
  async verifySystemConnectivity() {
    console.log('🔍 Verificando conectividade do sistema...');
    
    try {
      const axios = require('axios');
      const response = await axios.get(`${this.config.baseUrl}/health`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        console.log('✅ Sistema acessível e responsivo');
      } else {
        throw new Error(`Sistema retornou status ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Sistema não está acessível:', error.message);
      throw new Error('Sistema não está disponível para testes');
    }
  }

  /**
   * Executar testes de stress do banco
   */
  async runDatabaseStressTests() {
    try {
      const dbTester = new DatabaseStressTest({
        maxConnections: 50,
        batchSize: 500
      });

      const results = await dbTester.runDatabaseStressTest();
      
      console.log(`📊 Banco - Sucesso: ${results.success}`);
      console.log(`📊 Queries: ${results.metrics?.totalQueries || 0}`);
      console.log(`📊 Tempo médio: ${results.metrics?.avgQueryTime || 0}ms`);
      
      return results;
    } catch (error) {
      console.error('❌ Erro nos testes do banco:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Executar testes de stress das APIs
   */
  async runAPIStressTests() {
    try {
      const apiTester = new APIStressTest({
        baseUrl: this.config.baseUrl,
        maxRequestsPerSecond: 100
      });

      const results = await apiTester.runAPIStressTest();
      
      console.log(`📊 APIs - Sucesso: ${results.success}`);
      console.log(`📊 Requests: ${results.metrics?.overall?.totalRequests || 0}`);
      console.log(`📊 Taxa sucesso: ${results.metrics?.overall?.overallSuccessRate || 0}%`);
      
      return results;
    } catch (error) {
      console.error('❌ Erro nos testes das APIs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Executar testes de stress de memória
   */
  async runMemoryStressTests() {
    try {
      const memoryTester = new StressTestFramework();
      
      const results = await memoryTester.runMemoryStressTest({
        maxMemoryMB: 256, // 256MB para não sobrecarregar
        allocationStepMB: 16,
        holdTime: 30000
      });
      
      console.log(`📊 Memória - Sucesso: ${results.success}`);
      console.log(`📊 Máximo alocado: ${results.maxAllocatedMB}MB`);
      
      return results;
    } catch (error) {
      console.error('❌ Erro nos testes de memória:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Executar testes de concorrência
   */
  async runConcurrencyTests() {
    try {
      const concurrencyTester = new StressTestFramework();
      
      const tests = [
        {
          name: 'Database Write Concurrency',
          config: {
            concurrentOperations: 50,
            operationType: 'database_write',
            duration: 60000
          }
        },
        {
          name: 'Database Read Concurrency',
          config: {
            concurrentOperations: 100,
            operationType: 'database_read',
            duration: 60000
          }
        },
        {
          name: 'File Operation Concurrency',
          config: {
            concurrentOperations: 30,
            operationType: 'file_operation',
            duration: 60000
          }
        }
      ];

      const results = {};
      
      for (const test of tests) {
        console.log(`🔀 Executando: ${test.name}`);
        results[test.name] = await concurrencyTester.runConcurrencyTest(test.config);
        
        console.log(`   Sucesso: ${results[test.name].success}`);
        console.log(`   Taxa: ${results[test.name].successRate}%`);
      }

      const allSuccessful = Object.values(results).every(r => r.success);
      
      return {
        success: allSuccessful,
        tests: results,
        summary: {
          totalTests: tests.length,
          passedTests: Object.values(results).filter(r => r.success).length
        }
      };
    } catch (error) {
      console.error('❌ Erro nos testes de concorrência:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Executar testes de carga
   */
  async runLoadTests() {
    try {
      const loadTester = new StressTestFramework({
        baseUrl: this.config.baseUrl
      });

      const loadTests = [
        {
          endpoint: '/api/dashboard/estatisticas',
          config: {
            concurrentUsers: 100,
            requestsPerUser: 20,
            method: 'GET'
          }
        },
        {
          endpoint: '/api/colaboradores',
          config: {
            concurrentUsers: 50,
            requestsPerUser: 30,
            method: 'GET'
          }
        },
        {
          endpoint: '/api/ponto/relatorio',
          config: {
            concurrentUsers: 20,
            requestsPerUser: 5,
            method: 'GET'
          }
        }
      ];

      const results = {};
      
      for (const test of loadTests) {
        console.log(`📈 Testando carga: ${test.endpoint}`);
        results[test.endpoint] = await loadTester.runLoadTest(test.endpoint, test.config);
        
        console.log(`   Sucesso: ${results[test.endpoint].metrics?.successRate || 0}%`);
        console.log(`   Throughput: ${results[test.endpoint].metrics?.throughput || 0} req/s`);
        
        // Pausa entre testes
        await this.sleep(5000);
      }

      const allSuccessful = Object.values(results).every(r => 
        r.metrics && r.metrics.successRate >= 95
      );

      return {
        success: allSuccessful,
        tests: results,
        summary: this.summarizeLoadTests(results)
      };
    } catch (error) {
      console.error('❌ Erro nos testes de carga:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Resumir testes de carga
   */
  summarizeLoadTests(results) {
    const endpoints = Object.keys(results);
    let totalRequests = 0;
    let totalSuccessful = 0;
    let avgThroughput = 0;

    for (const endpoint of endpoints) {
      const result = results[endpoint];
      if (result.metrics) {
        totalRequests += result.metrics.totalRequests;
        totalSuccessful += result.metrics.successfulRequests;
        avgThroughput += result.metrics.throughput;
      }
    }

    return {
      totalEndpoints: endpoints.length,
      totalRequests,
      totalSuccessful,
      overallSuccessRate: Math.round((totalSuccessful / totalRequests) * 100),
      avgThroughput: Math.round(avgThroughput / endpoints.length)
    };
  }

  /**
   * Calcular resumo geral
   */
  calculateOverallSummary() {
    const tests = Object.values(this.results.tests);
    const passedTests = tests.filter(test => test.success).length;
    const totalDuration = this.results.endTime.getTime() - this.results.startTime.getTime();

    return {
      totalTestSuites: tests.length,
      passedTestSuites: passedTests,
      failedTestSuites: tests.length - passedTests,
      overallSuccessRate: Math.round((passedTests / tests.length) * 100),
      totalDuration: this.formatDuration(totalDuration),
      systemStability: this.evaluateSystemStability(),
      performanceGrade: this.calculatePerformanceGrade()
    };
  }

  /**
   * Avaliar estabilidade do sistema
   */
  evaluateSystemStability() {
    const tests = Object.values(this.results.tests);
    const dbTest = this.results.tests.database;
    const apiTest = this.results.tests.api;
    const memoryTest = this.results.tests.memory;

    // Critérios de estabilidade
    let stabilityScore = 100;

    // Penalizar por falhas de teste
    const failedTests = tests.filter(t => !t.success).length;
    stabilityScore -= failedTests * 20;

    // Penalizar por problemas específicos
    if (dbTest && dbTest.metrics?.deadlocks > 0) {
      stabilityScore -= 10;
    }

    if (apiTest && apiTest.metrics?.overall?.overallSuccessRate < 95) {
      stabilityScore -= 15;
    }

    if (memoryTest && !memoryTest.success) {
      stabilityScore -= 25;
    }

    if (stabilityScore >= 90) return 'EXCELLENT';
    if (stabilityScore >= 80) return 'GOOD';
    if (stabilityScore >= 70) return 'FAIR';
    if (stabilityScore >= 50) return 'POOR';
    return 'CRITICAL';
  }

  /**
   * Calcular grade de performance
   */
  calculatePerformanceGrade() {
    let score = 100;
    
    // Avaliar performance das APIs
    const apiTest = this.results.tests.api;
    if (apiTest && apiTest.tests) {
      const endpointStress = apiTest.tests.endpointStress;
      if (endpointStress) {
        for (const endpointResult of Object.values(endpointStress)) {
          if (endpointResult.avgResponseTime > 2000) {
            score -= 10;
          } else if (endpointResult.avgResponseTime > 1000) {
            score -= 5;
          }
        }
      }
    }

    // Avaliar performance do banco
    const dbTest = this.results.tests.database;
    if (dbTest && dbTest.metrics) {
      if (dbTest.metrics.avgQueryTime > 1000) {
        score -= 15;
      } else if (dbTest.metrics.avgQueryTime > 500) {
        score -= 8;
      }
      
      if (dbTest.metrics.slowQueryRate > 10) {
        score -= 10;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Gerar recomendações gerais
   */
  generateOverallRecommendations() {
    const recommendations = [];
    
    // Analisar resultados de cada teste
    const dbTest = this.results.tests.database;
    if (dbTest && !dbTest.success) {
      recommendations.push({
        priority: 'HIGH',
        category: 'DATABASE',
        message: 'Banco de dados falhou nos testes de stress',
        action: 'Otimizar configurações do banco e adicionar mais recursos'
      });
    }

    const apiTest = this.results.tests.api;
    if (apiTest && apiTest.metrics?.overall?.overallSuccessRate < 95) {
      recommendations.push({
        priority: 'HIGH',
        category: 'API',
        message: `Taxa de sucesso das APIs baixa: ${apiTest.metrics.overall.overallSuccessRate}%`,
        action: 'Otimizar endpoints e implementar cache adicional'
      });
    }

    const memoryTest = this.results.tests.memory;
    if (memoryTest && !memoryTest.success) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'MEMORY',
        message: 'Sistema falhou nos testes de stress de memória',
        action: 'Otimizar uso de memória e implementar garbage collection'
      });
    }

    // Recomendações baseadas na grade de performance
    const performanceGrade = this.calculatePerformanceGrade();
    if (performanceGrade < 80) {
      recommendations.push({
        priority: 'HIGH',
        category: 'PERFORMANCE',
        message: `Grade de performance baixa: ${performanceGrade}/100`,
        action: 'Implementar otimizações gerais de performance'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'INFO',
        category: 'SUCCESS',
        message: 'Sistema passou em todos os testes de stress',
        action: 'Manter configurações atuais e monitorar regularmente'
      });
    }

    return recommendations;
  }

  /**
   * Gerar relatórios
   */
  async generateReports() {
    try {
      // Garantir diretório de relatórios
      await fs.mkdir(this.config.outputDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Relatório JSON
      if (this.config.reportFormat === 'json' || this.config.reportFormat === 'both') {
        const jsonPath = path.join(this.config.outputDir, `stress-test-${timestamp}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));
        console.log(`💾 Relatório JSON salvo: ${jsonPath}`);
      }

      // Relatório em texto
      if (this.config.reportFormat === 'text' || this.config.reportFormat === 'both') {
        const textReport = this.generateTextReport();
        const textPath = path.join(this.config.outputDir, `stress-test-${timestamp}.txt`);
        await fs.writeFile(textPath, textReport);
        console.log(`📄 Relatório em texto salvo: ${textPath}`);
      }

      // Relatório HTML (executivo)
      const htmlReport = this.generateHTMLReport();
      const htmlPath = path.join(this.config.outputDir, `stress-test-${timestamp}.html`);
      await fs.writeFile(htmlPath, htmlReport);
      console.log(`🌐 Relatório HTML salvo: ${htmlPath}`);
      
    } catch (error) {
      console.error('❌ Erro ao gerar relatórios:', error);
    }
  }

  /**
   * Gerar relatório em texto
   */
  generateTextReport() {
    const lines = [];
    
    lines.push('🚀 RELATÓRIO DE TESTES DE STRESS - SISTEMA PONTO DIGITAL');
    lines.push('=======================================================');
    lines.push(`Data: ${this.results.startTime.toLocaleString('pt-BR')}`);
    lines.push(`Duração: ${this.results.summary.totalDuration}`);
    lines.push('');
    
    // Resumo executivo
    lines.push('📊 RESUMO EXECUTIVO:');
    lines.push(`- Suites de teste executadas: ${this.results.summary.totalTestSuites}`);
    lines.push(`- Suites aprovadas: ${this.results.summary.passedTestSuites}`);
    lines.push(`- Taxa de sucesso: ${this.results.summary.overallSuccessRate}%`);
    lines.push(`- Estabilidade do sistema: ${this.results.summary.systemStability}`);
    lines.push(`- Grade de performance: ${this.results.summary.performanceGrade}/100`);
    lines.push('');
    
    // Resultados por categoria
    for (const [category, result] of Object.entries(this.results.tests)) {
      lines.push(`${category.toUpperCase()}:`);
      lines.push(`- Sucesso: ${result.success ? 'SIM' : 'NÃO'}`);
      
      if (result.error) {
        lines.push(`- Erro: ${result.error}`);
      }
      
      if (result.metrics) {
        lines.push(`- Métricas: ${JSON.stringify(result.metrics, null, 2)}`);
      }
      
      lines.push('');
    }
    
    // Recomendações
    lines.push('💡 RECOMENDAÇÕES:');
    this.results.recommendations.forEach((rec, index) => {
      lines.push(`${index + 1}. [${rec.priority}] ${rec.message}`);
      lines.push(`   Ação: ${rec.action}`);
      lines.push('');
    });
    
    return lines.join('\n');
  }

  /**
   * Gerar relatório HTML
   */
  generateHTMLReport() {
    const successColor = this.results.summary.overallSuccessRate >= 90 ? '#28a745' : 
                        this.results.summary.overallSuccessRate >= 70 ? '#ffc107' : '#dc3545';
    
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Testes de Stress - Ponto Digital</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #007bff; color: white; padding: 20px; border-radius: 5px; }
        .summary { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .test-result { margin: 15px 0; padding: 15px; border-left: 4px solid #007bff; }
        .success { border-left-color: #28a745; }
        .failure { border-left-color: #dc3545; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #e9ecef; border-radius: 3px; }
        .recommendation { background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .critical { background: #f8d7da; }
        .high { background: #fff3cd; }
        .medium { background: #d1ecf1; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Relatório de Testes de Stress</h1>
        <h2>Sistema Ponto Digital</h2>
        <p>Gerado em: ${this.results.startTime.toLocaleString('pt-BR')}</p>
    </div>
    
    <div class="summary">
        <h2>📊 Resumo Executivo</h2>
        <div class="metric">
            <strong>Taxa de Sucesso:</strong><br>
            <span style="color: ${successColor}; font-size: 24px;">${this.results.summary.overallSuccessRate}%</span>
        </div>
        <div class="metric">
            <strong>Estabilidade:</strong><br>
            ${this.results.summary.systemStability}
        </div>
        <div class="metric">
            <strong>Performance:</strong><br>
            ${this.results.summary.performanceGrade}/100
        </div>
        <div class="metric">
            <strong>Duração:</strong><br>
            ${this.results.summary.totalDuration}
        </div>
    </div>
    
    <h2>🧪 Resultados dos Testes</h2>
    ${Object.entries(this.results.tests).map(([category, result]) => `
        <div class="test-result ${result.success ? 'success' : 'failure'}">
            <h3>${category.toUpperCase()}</h3>
            <p><strong>Status:</strong> ${result.success ? '✅ APROVADO' : '❌ REPROVADO'}</p>
            ${result.error ? `<p><strong>Erro:</strong> ${result.error}</p>` : ''}
            ${result.duration ? `<p><strong>Duração:</strong> ${this.formatDuration(result.duration)}</p>` : ''}
        </div>
    `).join('')}
    
    <h2>💡 Recomendações</h2>
    ${this.results.recommendations.map(rec => `
        <div class="recommendation ${rec.priority.toLowerCase()}">
            <strong>[${rec.priority}] ${rec.category}:</strong> ${rec.message}<br>
            <em>Ação: ${rec.action}</em>
        </div>
    `).join('')}
    
    <div style="margin-top: 40px; text-align: center; color: #6c757d;">
        <p>Relatório gerado pelo Sistema de Testes de Stress - Ponto Digital</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Exibir resultados no console
   */
  displayResults() {
    console.log('\n🎯 RESULTADOS FINAIS DOS TESTES DE STRESS');
    console.log('==========================================');
    
    // Resumo geral
    const summary = this.results.summary;
    console.log(`\n📈 RESUMO GERAL:`);
    console.log(`   Suites executadas: ${summary.totalTestSuites}`);
    console.log(`   Suites aprovadas: ${summary.passedTestSuites}`);
    console.log(`   Taxa de sucesso: ${summary.overallSuccessRate}%`);
    console.log(`   Duração total: ${summary.totalDuration}`);
    console.log(`   Estabilidade: ${summary.systemStability}`);
    console.log(`   Grade performance: ${summary.performanceGrade}/100`);
    
    // Resultados por categoria
    console.log(`\n📋 RESULTADOS POR CATEGORIA:`);
    for (const [category, result] of Object.entries(this.results.tests)) {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${category.toUpperCase()}: ${result.success ? 'APROVADO' : 'REPROVADO'}`);
      
      if (result.error) {
        console.log(`      Erro: ${result.error}`);
      }
    }
    
    // Recomendações críticas
    const criticalRecs = this.results.recommendations.filter(r => r.priority === 'CRITICAL' || r.priority === 'HIGH');
    if (criticalRecs.length > 0) {
      console.log(`\n🚨 RECOMENDAÇÕES CRÍTICAS:`);
      criticalRecs.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority}] ${rec.message}`);
        console.log(`      Ação: ${rec.action}`);
      });
    }
    
    // Status final
    const overallSuccess = summary.overallSuccessRate >= 80;
    console.log(`\n🎯 STATUS FINAL: ${overallSuccess ? '✅ SISTEMA APROVADO' : '❌ SISTEMA REPROVADO'}`);
    
    if (overallSuccess) {
      console.log('   O sistema está pronto para carga de produção');
    } else {
      console.log('   O sistema requer otimizações antes da produção');
    }
  }

  // Funções auxiliares
  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Executar testes se chamado diretamente
 */
async function main() {
  try {
    const config = {
      baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8080',
      maxConcurrentUsers: parseInt(process.env.MAX_CONCURRENT_USERS) || 500,
      testDuration: parseInt(process.env.TEST_DURATION) || 300000,
      runDatabaseTests: process.env.RUN_DB_TESTS !== 'false',
      runAPITests: process.env.RUN_API_TESTS !== 'false',
      runMemoryTests: process.env.RUN_MEMORY_TESTS !== 'false',
      runConcurrencyTests: process.env.RUN_CONCURRENCY_TESTS !== 'false',
      runLoadTests: process.env.RUN_LOAD_TESTS !== 'false'
    };

    const runner = new StressTestRunner(config);
    const results = await runner.runCompleteStressTestSuite();
    
    // Exit code baseado no sucesso
    const exitCode = results.summary.overallSuccessRate >= 80 ? 0 : 1;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Erro fatal nos testes:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = StressTestRunner;
