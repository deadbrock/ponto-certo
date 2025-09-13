/**
 * 📊 MONITOR DE TESTES DE STRESS
 * 
 * Sistema de monitoramento especializado para testes de stress:
 * - Monitoramento em tempo real durante testes
 * - Coleta de métricas de sistema
 * - Detecção de degradação de performance
 * - Alertas durante testes críticos
 * - Dashboard em tempo real
 * - Análise pós-teste
 */

const EventEmitter = require('events');
const os = require('os');
const v8 = require('v8');
const fs = require('fs');
const path = require('path');
const performanceMonitor = require('./performanceMonitor');
const alertManager = require('./alertManager');

class StressTestMonitor extends EventEmitter {
  constructor() {
    super();
    
    // Estado do monitoramento
    this.isMonitoring = false;
    this.currentTest = null;
    
    // Configurações
    this.config = {
      sampleInterval: 1000, // 1 segundo
      alertThresholds: {
        cpuUsage: 90, // 90%
        memoryUsage: 85, // 85%
        heapUsage: 90, // 90%
        responseTime: 5000, // 5 segundos
        errorRate: 10, // 10%
        throughputDrop: 50 // 50% de queda
      },
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 horas
      maxSamples: 10000
    };

    // Métricas coletadas
    this.metrics = {
      system: [],
      application: [],
      database: [],
      network: [],
      custom: []
    };

    // Baseline (métricas antes do teste)
    this.baseline = null;
    
    // Alertas durante teste
    this.testAlerts = [];
    
    // Histórico de testes
    this.testHistory = [];
  }

  /**
   * Iniciar monitoramento de teste
   */
  async startMonitoring(testInfo) {
    if (this.isMonitoring) {
      throw new Error('Monitoramento já está ativo');
    }

    console.log(`📊 Iniciando monitoramento para teste: ${testInfo.testId}`);
    
    this.isMonitoring = true;
    this.currentTest = {
      ...testInfo,
      startTime: Date.now(),
      endTime: null
    };

    // Coletar baseline
    this.baseline = await this.collectBaseline();
    
    // Iniciar coleta de métricas
    this.startMetricsCollection();
    
    // Configurar alertas específicos para teste
    this.setupTestAlerts();
    
    console.log('✅ Monitoramento de teste iniciado');
    this.emit('monitoring_started', this.currentTest);
  }

  /**
   * Parar monitoramento
   */
  async stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('📊 Parando monitoramento de teste...');
    
    this.isMonitoring = false;
    this.currentTest.endTime = Date.now();
    
    // Parar coleta de métricas
    this.stopMetricsCollection();
    
    // Gerar análise final
    const analysis = await this.generateTestAnalysis();
    
    // Salvar no histórico
    this.testHistory.push({
      ...this.currentTest,
      metrics: this.metrics,
      analysis,
      alerts: this.testAlerts
    });

    // Limpar estado
    this.testAlerts = [];
    this.metrics = {
      system: [],
      application: [],
      database: [],
      network: [],
      custom: []
    };

    console.log('✅ Monitoramento parado');
    this.emit('monitoring_stopped', analysis);
    
    return analysis;
  }

  /**
   * Coletar baseline do sistema
   */
  async collectBaseline() {
    console.log('📋 Coletando baseline do sistema...');
    
    const samples = [];
    
    // Coletar 10 amostras em 10 segundos
    for (let i = 0; i < 10; i++) {
      const sample = await this.collectSystemSample();
      samples.push(sample);
      await this.sleep(1000);
    }

    // Calcular médias
    const baseline = {
      cpu: this.calculateAverage(samples.map(s => s.cpu.usage)),
      memory: {
        rss: this.calculateAverage(samples.map(s => s.memory.rss)),
        heapUsed: this.calculateAverage(samples.map(s => s.memory.heapUsed)),
        heapTotal: this.calculateAverage(samples.map(s => s.memory.heapTotal))
      },
      handles: this.calculateAverage(samples.map(s => s.handles)),
      timestamp: Date.now()
    };

    console.log(`📊 Baseline coletado: CPU ${baseline.cpu.toFixed(1)}%, Heap ${Math.round(baseline.memory.heapUsed/1024/1024)}MB`);
    
    return baseline;
  }

  /**
   * Coletar amostra do sistema
   */
  async collectSystemSample() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const heapStats = v8.getHeapStatistics();
    
    // CPU usage (aproximado)
    const startUsage = process.cpuUsage();
    await this.sleep(100);
    const endUsage = process.cpuUsage(startUsage);
    const cpuPercent = (endUsage.user + endUsage.system) / 1000 / 100 * 100;

    return {
      timestamp: Date.now(),
      cpu: {
        usage: Math.min(cpuPercent, 100),
        user: endUsage.user,
        system: endUsage.system
      },
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      heap: {
        totalHeapSize: heapStats.total_heap_size,
        totalHeapSizeExecutable: heapStats.total_heap_size_executable,
        totalPhysicalSize: heapStats.total_physical_size,
        totalAvailableSize: heapStats.total_available_size,
        usedHeapSize: heapStats.used_heap_size,
        heapSizeLimit: heapStats.heap_size_limit
      },
      handles: process._getActiveHandles().length,
      uptime: process.uptime()
    };
  }

  /**
   * Iniciar coleta de métricas
   */
  startMetricsCollection() {
    this.metricsInterval = setInterval(async () => {
      if (!this.isMonitoring) return;
      
      try {
        // Coletar métricas do sistema
        const systemSample = await this.collectSystemSample();
        this.metrics.system.push(systemSample);
        
        // Coletar métricas da aplicação
        const appSample = await this.collectApplicationSample();
        this.metrics.application.push(appSample);
        
        // Coletar métricas do banco
        const dbSample = await this.collectDatabaseSample();
        this.metrics.database.push(dbSample);
        
        // Verificar thresholds
        this.checkThresholds(systemSample, appSample, dbSample);
        
        // Emitir métricas em tempo real
        this.emit('metrics_collected', {
          system: systemSample,
          application: appSample,
          database: dbSample
        });
        
        // Limitar número de amostras
        this.limitSamples();
        
      } catch (error) {
        console.error('❌ Erro na coleta de métricas:', error);
      }
    }, this.config.sampleInterval);
  }

  /**
   * Coletar métricas da aplicação
   */
  async collectApplicationSample() {
    try {
      // Obter métricas do performance monitor
      const perfStats = performanceMonitor.getStats();
      
      return {
        timestamp: Date.now(),
        requests: {
          total: perfStats.metrics?.requests?.total || 0,
          successful: perfStats.metrics?.requests?.successful || 0,
          failed: perfStats.metrics?.requests?.failed || 0,
          avgResponseTime: perfStats.metrics?.requests?.avgResponseTime || 0
        },
        cache: {
          hits: perfStats.metrics?.cache?.hits || 0,
          misses: perfStats.metrics?.cache?.misses || 0,
          hitRate: perfStats.metrics?.cache?.hitRate || 0
        },
        errors: perfStats.metrics?.errors?.total || 0
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        error: error.message
      };
    }
  }

  /**
   * Coletar métricas do banco
   */
  async collectDatabaseSample() {
    try {
      const db = require('../config/database');
      
      // Queries para métricas do banco
      const queries = [
        {
          name: 'active_connections',
          query: `SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'`
        },
        {
          name: 'total_connections',
          query: `SELECT count(*) as count FROM pg_stat_activity`
        },
        {
          name: 'slow_queries',
          query: `SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '10 seconds'`
        }
      ];

      const results = {};
      
      for (const queryInfo of queries) {
        try {
          const startTime = Date.now();
          const result = await db.query(queryInfo.query);
          const queryTime = Date.now() - startTime;
          
          results[queryInfo.name] = {
            value: parseInt(result.rows[0].count),
            queryTime
          };
        } catch (error) {
          results[queryInfo.name] = {
            error: error.message,
            queryTime: 0
          };
        }
      }

      return {
        timestamp: Date.now(),
        connections: {
          active: results.active_connections?.value || 0,
          total: results.total_connections?.value || 0
        },
        slowQueries: results.slow_queries?.value || 0,
        avgQueryTime: (
          results.active_connections?.queryTime +
          results.total_connections?.queryTime +
          results.slow_queries?.queryTime
        ) / 3
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        error: error.message
      };
    }
  }

  /**
   * Verificar thresholds
   */
  checkThresholds(systemSample, appSample, dbSample) {
    const alerts = [];
    
    // Verificar CPU
    if (systemSample.cpu.usage > this.config.alertThresholds.cpuUsage) {
      alerts.push({
        type: 'HIGH_CPU_USAGE',
        severity: 'HIGH',
        value: systemSample.cpu.usage,
        threshold: this.config.alertThresholds.cpuUsage,
        message: `CPU usage alto durante teste: ${systemSample.cpu.usage.toFixed(1)}%`
      });
    }

    // Verificar memória
    const memoryUsagePercent = (systemSample.memory.heapUsed / systemSample.memory.heapTotal) * 100;
    if (memoryUsagePercent > this.config.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'HIGH',
        value: memoryUsagePercent,
        threshold: this.config.alertThresholds.memoryUsage,
        message: `Uso de memória alto durante teste: ${memoryUsagePercent.toFixed(1)}%`
      });
    }

    // Verificar tempo de resposta
    if (appSample.requests.avgResponseTime > this.config.alertThresholds.responseTime) {
      alerts.push({
        type: 'HIGH_RESPONSE_TIME',
        severity: 'MEDIUM',
        value: appSample.requests.avgResponseTime,
        threshold: this.config.alertThresholds.responseTime,
        message: `Tempo de resposta alto: ${appSample.requests.avgResponseTime}ms`
      });
    }

    // Verificar taxa de erro
    const errorRate = appSample.requests.total > 0 ?
      (appSample.requests.failed / appSample.requests.total) * 100 : 0;
    
    if (errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        severity: 'HIGH',
        value: errorRate,
        threshold: this.config.alertThresholds.errorRate,
        message: `Taxa de erro alta: ${errorRate.toFixed(1)}%`
      });
    }

    // Registrar alertas
    for (const alert of alerts) {
      this.recordTestAlert(alert);
    }
  }

  /**
   * Registrar alerta durante teste
   */
  recordTestAlert(alert) {
    const testAlert = {
      ...alert,
      testId: this.currentTest?.testId,
      timestamp: Date.now()
    };

    this.testAlerts.push(testAlert);
    
    console.warn(`⚠️ ALERTA DURANTE TESTE: ${alert.message}`);
    
    // Emitir evento
    this.emit('test_alert', testAlert);
    
    // Integrar com sistema de alertas se crítico
    if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
      alertManager.processSecurityEvent({
        type: 'STRESS_TEST_ALERT',
        source: 'stress_test_monitor',
        metadata: {
          test_id: this.currentTest?.testId,
          alert_type: alert.type,
          value: alert.value,
          threshold: alert.threshold
        }
      });
    }
  }

  /**
   * Parar coleta de métricas
   */
  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Configurar alertas específicos para teste
   */
  setupTestAlerts() {
    // Configurar thresholds mais restritivos durante testes
    this.originalThresholds = { ...this.config.alertThresholds };
    
    // Reduzir thresholds durante teste para detectar degradação mais cedo
    this.config.alertThresholds.cpuUsage = 80;
    this.config.alertThresholds.memoryUsage = 75;
    this.config.alertThresholds.responseTime = 3000;
  }

  /**
   * Restaurar alertas normais
   */
  restoreNormalAlerts() {
    if (this.originalThresholds) {
      this.config.alertThresholds = { ...this.originalThresholds };
      this.originalThresholds = null;
    }
  }

  /**
   * Limitar número de amostras
   */
  limitSamples() {
    const categories = ['system', 'application', 'database', 'network', 'custom'];
    
    for (const category of categories) {
      if (this.metrics[category].length > this.config.maxSamples) {
        // Manter apenas as mais recentes
        this.metrics[category] = this.metrics[category].slice(-this.config.maxSamples);
      }
    }
  }

  /**
   * Gerar análise do teste
   */
  async generateTestAnalysis() {
    console.log('📊 Gerando análise do teste...');
    
    try {
      const analysis = {
        testId: this.currentTest.testId,
        duration: this.currentTest.endTime - this.currentTest.startTime,
        baseline: this.baseline,
        peakMetrics: this.calculatePeakMetrics(),
        averageMetrics: this.calculateAverageMetrics(),
        degradationAnalysis: this.analyzeDegradation(),
        alertsSummary: this.summarizeAlerts(),
        performanceScore: this.calculatePerformanceScore(),
        recommendations: this.generateTestRecommendations()
      };

      return analysis;
    } catch (error) {
      console.error('❌ Erro ao gerar análise:', error);
      return {
        error: error.message,
        testId: this.currentTest?.testId
      };
    }
  }

  /**
   * Calcular métricas de pico
   */
  calculatePeakMetrics() {
    const systemMetrics = this.metrics.system;
    if (systemMetrics.length === 0) return {};

    return {
      cpu: {
        peak: Math.max(...systemMetrics.map(m => m.cpu.usage)),
        peakTime: this.findPeakTime(systemMetrics, 'cpu.usage')
      },
      memory: {
        peakHeapUsed: Math.max(...systemMetrics.map(m => m.memory.heapUsed)),
        peakRSS: Math.max(...systemMetrics.map(m => m.memory.rss)),
        peakTime: this.findPeakTime(systemMetrics, 'memory.heapUsed')
      },
      handles: {
        peak: Math.max(...systemMetrics.map(m => m.handles)),
        peakTime: this.findPeakTime(systemMetrics, 'handles')
      }
    };
  }

  /**
   * Encontrar momento do pico
   */
  findPeakTime(metrics, property) {
    let maxValue = 0;
    let maxTime = null;

    for (const metric of metrics) {
      const value = this.getNestedProperty(metric, property);
      if (value > maxValue) {
        maxValue = value;
        maxTime = metric.timestamp;
      }
    }

    return maxTime;
  }

  /**
   * Obter propriedade aninhada
   */
  getNestedProperty(obj, property) {
    return property.split('.').reduce((o, p) => o && o[p], obj);
  }

  /**
   * Calcular métricas médias
   */
  calculateAverageMetrics() {
    const systemMetrics = this.metrics.system;
    if (systemMetrics.length === 0) return {};

    return {
      cpu: {
        average: this.calculateAverage(systemMetrics.map(m => m.cpu.usage)),
        samples: systemMetrics.length
      },
      memory: {
        avgHeapUsed: this.calculateAverage(systemMetrics.map(m => m.memory.heapUsed)),
        avgRSS: this.calculateAverage(systemMetrics.map(m => m.memory.rss)),
        samples: systemMetrics.length
      },
      handles: {
        average: this.calculateAverage(systemMetrics.map(m => m.handles)),
        samples: systemMetrics.length
      }
    };
  }

  /**
   * Analisar degradação
   */
  analyzeDegradation() {
    if (!this.baseline || this.metrics.system.length === 0) {
      return { analysis: 'Dados insuficientes para análise' };
    }

    const currentMetrics = this.calculateAverageMetrics();
    
    const degradation = {
      cpu: {
        baselineAvg: this.baseline.cpu,
        testAvg: currentMetrics.cpu.average,
        increase: currentMetrics.cpu.average - this.baseline.cpu,
        increasePercent: ((currentMetrics.cpu.average - this.baseline.cpu) / this.baseline.cpu) * 100
      },
      memory: {
        baselineHeap: this.baseline.memory.heapUsed,
        testHeap: currentMetrics.memory.avgHeapUsed,
        increase: currentMetrics.memory.avgHeapUsed - this.baseline.memory.heapUsed,
        increasePercent: ((currentMetrics.memory.avgHeapUsed - this.baseline.memory.heapUsed) / this.baseline.memory.heapUsed) * 100
      }
    };

    // Avaliar severidade da degradação
    degradation.severity = this.evaluateDegradationSeverity(degradation);
    
    return degradation;
  }

  /**
   * Avaliar severidade da degradação
   */
  evaluateDegradationSeverity(degradation) {
    let score = 0;
    
    // CPU
    if (degradation.cpu.increasePercent > 100) score += 3; // Dobrou
    else if (degradation.cpu.increasePercent > 50) score += 2;
    else if (degradation.cpu.increasePercent > 25) score += 1;
    
    // Memória
    if (degradation.memory.increasePercent > 100) score += 3;
    else if (degradation.memory.increasePercent > 50) score += 2;
    else if (degradation.memory.increasePercent > 25) score += 1;

    if (score >= 5) return 'CRITICAL';
    if (score >= 3) return 'HIGH';
    if (score >= 2) return 'MEDIUM';
    if (score >= 1) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Resumir alertas
   */
  summarizeAlerts() {
    const alertsByType = new Map();
    const alertsBySeverity = new Map();
    
    for (const alert of this.testAlerts) {
      // Por tipo
      const typeCount = alertsByType.get(alert.type) || 0;
      alertsByType.set(alert.type, typeCount + 1);
      
      // Por severidade
      const severityCount = alertsBySeverity.get(alert.severity) || 0;
      alertsBySeverity.set(alert.severity, severityCount + 1);
    }

    return {
      total: this.testAlerts.length,
      byType: Object.fromEntries(alertsByType),
      bySeverity: Object.fromEntries(alertsBySeverity),
      timeline: this.testAlerts.map(alert => ({
        type: alert.type,
        severity: alert.severity,
        timestamp: alert.timestamp,
        message: alert.message
      }))
    };
  }

  /**
   * Calcular score de performance
   */
  calculatePerformanceScore() {
    let score = 100;
    
    // Penalizar por alertas
    const criticalAlerts = this.testAlerts.filter(a => a.severity === 'CRITICAL').length;
    const highAlerts = this.testAlerts.filter(a => a.severity === 'HIGH').length;
    
    score -= criticalAlerts * 20;
    score -= highAlerts * 10;
    
    // Penalizar por degradação
    const degradation = this.analyzeDegradation();
    if (degradation.severity === 'CRITICAL') score -= 30;
    else if (degradation.severity === 'HIGH') score -= 20;
    else if (degradation.severity === 'MEDIUM') score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Gerar recomendações do teste
   */
  generateTestRecommendations() {
    const recommendations = [];
    
    // Baseado em alertas
    const cpuAlerts = this.testAlerts.filter(a => a.type === 'HIGH_CPU_USAGE').length;
    if (cpuAlerts > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'CPU',
        message: `${cpuAlerts} alertas de CPU alto durante teste`,
        action: 'Otimizar código para reduzir uso de CPU'
      });
    }

    const memoryAlerts = this.testAlerts.filter(a => a.type === 'HIGH_MEMORY_USAGE').length;
    if (memoryAlerts > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'MEMORY',
        message: `${memoryAlerts} alertas de memória alta durante teste`,
        action: 'Otimizar uso de memória e implementar garbage collection'
      });
    }

    // Baseado em degradação
    const degradation = this.analyzeDegradation();
    if (degradation.severity === 'HIGH' || degradation.severity === 'CRITICAL') {
      recommendations.push({
        priority: 'HIGH',
        category: 'PERFORMANCE',
        message: `Degradação significativa detectada: ${degradation.severity}`,
        action: 'Revisar arquitetura e otimizar componentes críticos'
      });
    }

    return recommendations;
  }

  /**
   * Obter métricas em tempo real
   */
  getRealTimeMetrics() {
    if (!this.isMonitoring) {
      return { monitoring: false };
    }

    const latest = {
      system: this.metrics.system[this.metrics.system.length - 1],
      application: this.metrics.application[this.metrics.application.length - 1],
      database: this.metrics.database[this.metrics.database.length - 1]
    };

    return {
      monitoring: true,
      testId: this.currentTest.testId,
      elapsed: Date.now() - this.currentTest.startTime,
      latest,
      alerts: this.testAlerts.length,
      samples: this.metrics.system.length
    };
  }

  /**
   * Salvar snapshot das métricas
   */
  async saveMetricsSnapshot(filename) {
    try {
      const snapshot = {
        testId: this.currentTest?.testId,
        timestamp: new Date(),
        baseline: this.baseline,
        metrics: this.metrics,
        alerts: this.testAlerts,
        analysis: await this.generateTestAnalysis()
      };

      const snapshotPath = path.join(__dirname, '../reports/snapshots', filename);
      await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
      await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
      
      console.log(`📸 Snapshot salvo: ${snapshotPath}`);
      return snapshotPath;
    } catch (error) {
      console.error('❌ Erro ao salvar snapshot:', error);
      throw error;
    }
  }

  // Funções auxiliares
  calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

// Singleton instance
const stressTestMonitor = new StressTestMonitor();

module.exports = stressTestMonitor;
