/**
 * 📊 MONITOR DE PERFORMANCE EM TEMPO REAL
 * 
 * Sistema avançado de monitoramento de performance com alertas automáticos,
 * análise de tendências e otimização contínua
 */

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs');
const path = require('path');
const v8 = require('v8');

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    
    // Métricas em tempo real
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        slow: 0,
        avgResponseTime: 0,
        responseTimes: []
      },
      database: {
        queries: 0,
        slowQueries: 0,
        avgQueryTime: 0,
        queryTimes: [],
        connections: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        sets: 0,
        hitRate: 0
      },
      system: {
        cpuUsage: 0,
        memoryUsage: 0,
        heapUsage: 0,
        uptime: 0,
        loadAverage: []
      },
      errors: {
        total: 0,
        byType: new Map(),
        recent: []
      }
    };

    // Configurações de alertas
    this.alertThresholds = {
      responseTime: 2000, // ms
      queryTime: 1000, // ms
      errorRate: 5, // %
      cpuUsage: 80, // %
      memoryUsage: 85, // %
      heapUsage: 90, // %
      cacheHitRate: 70 // %
    };

    // Histórico de métricas
    this.history = {
      hourly: [],
      daily: [],
      maxHourlyEntries: 24,
      maxDailyEntries: 30
    };

    // Estado de alertas
    this.activeAlerts = new Map();
    this.alertCooldowns = new Map();

    // Inicializar monitoramento
    this.startMonitoring();
  }

  /**
   * Inicializar sistema de monitoramento
   */
  startMonitoring() {
    console.log('📊 PERFORMANCE MONITOR: Sistema iniciado');

    // Coletar métricas do sistema a cada 30 segundos
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Gerar relatório horário
    setInterval(() => {
      this.generateHourlyReport();
    }, 3600000); // 1 hora

    // Gerar relatório diário
    setInterval(() => {
      this.generateDailyReport();
    }, 86400000); // 24 horas

    // Verificar alertas a cada minuto
    setInterval(() => {
      this.checkAlerts();
    }, 60000);

    // Limpeza de dados antigos a cada 6 horas
    setInterval(() => {
      this.cleanupOldData();
    }, 21600000);
  }

  /**
   * Middleware de monitoramento de performance
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const originalSend = res.send;

      // Incrementar contador de requests
      this.metrics.requests.total++;

      // Interceptar resposta
      res.send = (data) => {
        const responseTime = Date.now() - startTime;
        
        // Registrar métricas da requisição
        this.recordRequestMetrics(req, res, responseTime);
        
        // Adicionar headers de performance
        res.set({
          'X-Response-Time': `${responseTime}ms`,
          'X-Performance-Score': this.calculatePerformanceScore(),
          'X-Cache-Hit-Rate': `${this.metrics.cache.hitRate}%`
        });

        return originalSend.call(res, data);
      };

      next();
    };
  }

  /**
   * Registrar métricas de requisição
   */
  recordRequestMetrics(req, res, responseTime) {
    // Atualizar contadores
    if (res.statusCode >= 200 && res.statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
      this.recordError(res.statusCode, req.path);
    }

    // Registrar tempo de resposta
    this.metrics.requests.responseTimes.push(responseTime);
    
    // Manter apenas últimos 1000 tempos
    if (this.metrics.requests.responseTimes.length > 1000) {
      this.metrics.requests.responseTimes.shift();
    }

    // Calcular média
    this.metrics.requests.avgResponseTime = this.calculateAverage(
      this.metrics.requests.responseTimes
    );

    // Identificar requests lentos
    if (responseTime > this.alertThresholds.responseTime) {
      this.metrics.requests.slow++;
      this.handleSlowRequest(req, responseTime);
    }

    // Emitir evento de métrica
    this.emit('requestMetric', {
      path: req.path,
      method: req.method,
      responseTime,
      status: res.statusCode
    });
  }

  /**
   * Registrar métricas de query de banco
   */
  recordQueryMetrics(queryName, executionTime, error = null) {
    this.metrics.database.queries++;
    this.metrics.database.queryTimes.push(executionTime);

    // Manter apenas últimos 1000 tempos
    if (this.metrics.database.queryTimes.length > 1000) {
      this.metrics.database.queryTimes.shift();
    }

    // Calcular média
    this.metrics.database.avgQueryTime = this.calculateAverage(
      this.metrics.database.queryTimes
    );

    // Identificar queries lentas
    if (executionTime > this.alertThresholds.queryTime) {
      this.metrics.database.slowQueries++;
      this.handleSlowQuery(queryName, executionTime);
    }

    // Registrar erro se houver
    if (error) {
      this.recordError('DATABASE_ERROR', queryName, error);
    }

    // Emitir evento de métrica
    this.emit('queryMetric', {
      queryName,
      executionTime,
      error
    });
  }

  /**
   * Registrar métricas de cache
   */
  recordCacheMetrics(operation, key, hit = false) {
    if (operation === 'get') {
      if (hit) {
        this.metrics.cache.hits++;
      } else {
        this.metrics.cache.misses++;
      }
    } else if (operation === 'set') {
      this.metrics.cache.sets++;
    }

    // Calcular hit rate
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? 
      Math.round((this.metrics.cache.hits / total) * 100) : 0;

    // Verificar se hit rate está baixo
    if (this.metrics.cache.hitRate < this.alertThresholds.cacheHitRate && total > 100) {
      this.handleLowCacheHitRate();
    }
  }

  /**
   * Coletar métricas do sistema
   */
  collectSystemMetrics() {
    try {
      // CPU Usage
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      this.metrics.system.cpuUsage = Math.round(100 - (totalIdle / totalTick) * 100);

      // Memory Usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      this.metrics.system.memoryUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);

      // Heap Usage
      const heapStats = v8.getHeapStatistics();
      this.metrics.system.heapUsage = Math.round((heapStats.used_heap_size / heapStats.heap_size_limit) * 100);

      // Uptime
      this.metrics.system.uptime = Math.round(process.uptime());

      // Load Average
      this.metrics.system.loadAverage = os.loadavg();

      // Verificar alertas de sistema
      this.checkSystemAlerts();

    } catch (error) {
      console.error('❌ Erro ao coletar métricas do sistema:', error);
    }
  }

  /**
   * Verificar alertas de sistema
   */
  checkSystemAlerts() {
    // CPU Usage
    if (this.metrics.system.cpuUsage > this.alertThresholds.cpuUsage) {
      this.triggerAlert('HIGH_CPU_USAGE', {
        current: this.metrics.system.cpuUsage,
        threshold: this.alertThresholds.cpuUsage
      });
    }

    // Memory Usage
    if (this.metrics.system.memoryUsage > this.alertThresholds.memoryUsage) {
      this.triggerAlert('HIGH_MEMORY_USAGE', {
        current: this.metrics.system.memoryUsage,
        threshold: this.alertThresholds.memoryUsage
      });
    }

    // Heap Usage
    if (this.metrics.system.heapUsage > this.alertThresholds.heapUsage) {
      this.triggerAlert('HIGH_HEAP_USAGE', {
        current: this.metrics.system.heapUsage,
        threshold: this.alertThresholds.heapUsage
      });
    }
  }

  /**
   * Verificar todos os alertas
   */
  checkAlerts() {
    const now = Date.now();
    
    // Verificar error rate
    const totalRequests = this.metrics.requests.total;
    const errorRate = totalRequests > 0 ? 
      (this.metrics.requests.failed / totalRequests) * 100 : 0;

    if (errorRate > this.alertThresholds.errorRate && totalRequests > 100) {
      this.triggerAlert('HIGH_ERROR_RATE', {
        current: Math.round(errorRate * 100) / 100,
        threshold: this.alertThresholds.errorRate,
        totalRequests
      });
    }

    // Verificar response time médio
    if (this.metrics.requests.avgResponseTime > this.alertThresholds.responseTime) {
      this.triggerAlert('HIGH_RESPONSE_TIME', {
        current: this.metrics.requests.avgResponseTime,
        threshold: this.alertThresholds.responseTime
      });
    }

    // Limpar alertas expirados
    this.cleanupExpiredAlerts();
  }

  /**
   * Disparar alerta
   */
  triggerAlert(type, data) {
    const alertKey = `${type}_${Date.now()}`;
    const cooldownKey = type;
    const now = Date.now();

    // Verificar cooldown (evitar spam de alertas)
    const lastAlert = this.alertCooldowns.get(cooldownKey);
    if (lastAlert && (now - lastAlert) < 300000) { // 5 minutos
      return;
    }

    const alert = {
      id: alertKey,
      type,
      timestamp: now,
      data,
      severity: this.getAlertSeverity(type),
      message: this.generateAlertMessage(type, data),
      acknowledged: false
    };

    this.activeAlerts.set(alertKey, alert);
    this.alertCooldowns.set(cooldownKey, now);

    // Log do alerta
    console.warn(`🚨 PERFORMANCE ALERT: ${alert.message}`);

    // Emitir evento
    this.emit('performanceAlert', alert);

    // Salvar alerta crítico
    if (alert.severity === 'CRITICAL') {
      this.saveAlert(alert);
    }
  }

  /**
   * Gerar mensagem de alerta
   */
  generateAlertMessage(type, data) {
    const messages = {
      'HIGH_CPU_USAGE': `CPU usage alto: ${data.current}% (limite: ${data.threshold}%)`,
      'HIGH_MEMORY_USAGE': `Uso de memória alto: ${data.current}% (limite: ${data.threshold}%)`,
      'HIGH_HEAP_USAGE': `Heap usage alto: ${data.current}% (limite: ${data.threshold}%)`,
      'HIGH_ERROR_RATE': `Taxa de erro alta: ${data.current}% (limite: ${data.threshold}%)`,
      'HIGH_RESPONSE_TIME': `Tempo de resposta alto: ${data.current}ms (limite: ${data.threshold}ms)`,
      'SLOW_QUERY': `Query lenta detectada: ${data.queryName} (${data.time}ms)`,
      'LOW_CACHE_HIT_RATE': `Cache hit rate baixo: ${data.current}% (limite: ${data.threshold}%)`
    };

    return messages[type] || `Alerta de performance: ${type}`;
  }

  /**
   * Obter severidade do alerta
   */
  getAlertSeverity(type) {
    const severities = {
      'HIGH_CPU_USAGE': 'HIGH',
      'HIGH_MEMORY_USAGE': 'CRITICAL',
      'HIGH_HEAP_USAGE': 'CRITICAL',
      'HIGH_ERROR_RATE': 'HIGH',
      'HIGH_RESPONSE_TIME': 'MEDIUM',
      'SLOW_QUERY': 'MEDIUM',
      'LOW_CACHE_HIT_RATE': 'LOW'
    };

    return severities[type] || 'MEDIUM';
  }

  /**
   * Lidar com request lento
   */
  handleSlowRequest(req, responseTime) {
    this.triggerAlert('HIGH_RESPONSE_TIME', {
      path: req.path,
      method: req.method,
      time: responseTime,
      threshold: this.alertThresholds.responseTime
    });
  }

  /**
   * Lidar com query lenta
   */
  handleSlowQuery(queryName, executionTime) {
    this.triggerAlert('SLOW_QUERY', {
      queryName,
      time: executionTime,
      threshold: this.alertThresholds.queryTime
    });
  }

  /**
   * Lidar com cache hit rate baixo
   */
  handleLowCacheHitRate() {
    this.triggerAlert('LOW_CACHE_HIT_RATE', {
      current: this.metrics.cache.hitRate,
      threshold: this.alertThresholds.cacheHitRate
    });
  }

  /**
   * Registrar erro
   */
  recordError(type, context, error = null) {
    this.metrics.errors.total++;
    
    // Contar por tipo
    const currentCount = this.metrics.errors.byType.get(type) || 0;
    this.metrics.errors.byType.set(type, currentCount + 1);

    // Adicionar aos erros recentes
    this.metrics.errors.recent.push({
      type,
      context,
      error: error?.message || error,
      timestamp: Date.now()
    });

    // Manter apenas últimos 100 erros
    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent.shift();
    }
  }

  /**
   * Gerar relatório horário
   */
  generateHourlyReport() {
    const report = {
      timestamp: new Date(),
      period: 'hourly',
      metrics: { ...this.metrics },
      performance: this.calculatePerformanceScore(),
      trends: this.calculateTrends('hourly'),
      recommendations: this.generateRecommendations()
    };

    this.history.hourly.push(report);

    // Manter apenas últimas 24 horas
    if (this.history.hourly.length > this.history.maxHourlyEntries) {
      this.history.hourly.shift();
    }

    // Log do relatório
    console.log(`📊 HOURLY REPORT - Performance Score: ${report.performance.score}/100`);

    this.emit('hourlyReport', report);
    return report;
  }

  /**
   * Gerar relatório diário
   */
  generateDailyReport() {
    const report = {
      timestamp: new Date(),
      period: 'daily',
      summary: this.generateDailySummary(),
      trends: this.calculateTrends('daily'),
      topIssues: this.getTopIssues(),
      recommendations: this.generateDailyRecommendations()
    };

    this.history.daily.push(report);

    // Manter apenas últimos 30 dias
    if (this.history.daily.length > this.history.maxDailyEntries) {
      this.history.daily.shift();
    }

    // Salvar relatório
    this.saveDailyReport(report);

    console.log(`📊 DAILY REPORT - System Health: ${report.summary.systemHealth}`);

    this.emit('dailyReport', report);
    return report;
  }

  /**
   * Calcular score de performance
   */
  calculatePerformanceScore() {
    let score = 100;

    // Response time (30%)
    const avgResponseTime = this.metrics.requests.avgResponseTime;
    if (avgResponseTime > 2000) score -= 30;
    else if (avgResponseTime > 1000) score -= 15;
    else if (avgResponseTime > 500) score -= 8;

    // Error rate (25%)
    const errorRate = this.metrics.requests.total > 0 ? 
      (this.metrics.requests.failed / this.metrics.requests.total) * 100 : 0;
    if (errorRate > 10) score -= 25;
    else if (errorRate > 5) score -= 15;
    else if (errorRate > 2) score -= 8;

    // Cache hit rate (20%)
    if (this.metrics.cache.hitRate < 50) score -= 20;
    else if (this.metrics.cache.hitRate < 70) score -= 10;
    else if (this.metrics.cache.hitRate < 85) score -= 5;

    // System resources (25%)
    if (this.metrics.system.cpuUsage > 90) score -= 15;
    else if (this.metrics.system.cpuUsage > 80) score -= 8;
    
    if (this.metrics.system.memoryUsage > 90) score -= 10;
    else if (this.metrics.system.memoryUsage > 80) score -= 5;

    return {
      score: Math.max(0, Math.round(score)),
      breakdown: {
        responseTime: avgResponseTime,
        errorRate: Math.round(errorRate * 100) / 100,
        cacheHitRate: this.metrics.cache.hitRate,
        cpuUsage: this.metrics.system.cpuUsage,
        memoryUsage: this.metrics.system.memoryUsage
      }
    };
  }

  /**
   * Calcular tendências
   */
  calculateTrends(period) {
    const history = this.history[period];
    if (history.length < 2) return {};

    const current = history[history.length - 1];
    const previous = history[history.length - 2];

    return {
      responseTime: this.calculateTrend(
        current.metrics.requests.avgResponseTime,
        previous.metrics.requests.avgResponseTime
      ),
      errorRate: this.calculateTrend(
        current.metrics.requests.failed / current.metrics.requests.total * 100,
        previous.metrics.requests.failed / previous.metrics.requests.total * 100
      ),
      cacheHitRate: this.calculateTrend(
        current.metrics.cache.hitRate,
        previous.metrics.cache.hitRate
      )
    };
  }

  /**
   * Calcular mudança percentual
   */
  calculateTrend(current, previous) {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Gerar recomendações
   */
  generateRecommendations() {
    const recommendations = [];

    // Recomendações baseadas em métricas
    if (this.metrics.requests.avgResponseTime > 1000) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'HIGH',
        message: 'Otimizar queries lentas e implementar cache adicional',
        action: 'query_optimization'
      });
    }

    if (this.metrics.cache.hitRate < 70) {
      recommendations.push({
        type: 'CACHE',
        priority: 'MEDIUM',
        message: 'Revisar estratégia de cache e TTL',
        action: 'cache_optimization'
      });
    }

    if (this.metrics.system.memoryUsage > 80) {
      recommendations.push({
        type: 'MEMORY',
        priority: 'HIGH',
        message: 'Otimizar uso de memória e implementar garbage collection',
        action: 'memory_optimization'
      });
    }

    if (this.metrics.database.slowQueries > 10) {
      recommendations.push({
        type: 'DATABASE',
        priority: 'HIGH',
        message: 'Adicionar índices e otimizar queries do banco',
        action: 'database_optimization'
      });
    }

    return recommendations;
  }

  /**
   * Obter estatísticas atuais
   */
  getStats() {
    return {
      timestamp: new Date(),
      metrics: this.metrics,
      performance: this.calculatePerformanceScore(),
      activeAlerts: Array.from(this.activeAlerts.values()),
      systemHealth: this.getSystemHealth(),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Obter saúde do sistema
   */
  getSystemHealth() {
    const performance = this.calculatePerformanceScore();
    const alertCount = this.activeAlerts.size;
    
    if (performance.score >= 90 && alertCount === 0) return 'EXCELLENT';
    if (performance.score >= 80 && alertCount <= 2) return 'GOOD';
    if (performance.score >= 70 && alertCount <= 5) return 'FAIR';
    if (performance.score >= 50) return 'POOR';
    return 'CRITICAL';
  }

  /**
   * Salvar alerta crítico
   */
  saveAlert(alert) {
    try {
      const alertsDir = path.join(__dirname, '..', 'logs', 'alerts');
      if (!fs.existsSync(alertsDir)) {
        fs.mkdirSync(alertsDir, { recursive: true });
      }

      const alertFile = path.join(alertsDir, `alert-${Date.now()}.json`);
      fs.writeFileSync(alertFile, JSON.stringify(alert, null, 2));
    } catch (error) {
      console.error('❌ Erro ao salvar alerta:', error);
    }
  }

  /**
   * Salvar relatório diário
   */
  saveDailyReport(report) {
    try {
      const reportsDir = path.join(__dirname, '..', 'logs', 'performance');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const reportFile = path.join(reportsDir, `daily-${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    } catch (error) {
      console.error('❌ Erro ao salvar relatório diário:', error);
    }
  }

  // Funções auxiliares
  calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
  }

  cleanupExpiredAlerts() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [id, alert] of this.activeAlerts) {
      if (now - alert.timestamp > maxAge) {
        this.activeAlerts.delete(id);
      }
    }
  }

  cleanupOldData() {
    // Limpar dados antigos das métricas
    const maxAge = Date.now() - (24 * 60 * 60 * 1000);

    this.metrics.errors.recent = this.metrics.errors.recent.filter(
      error => error.timestamp > maxAge
    );

    console.log('🧹 Limpeza de dados antigos realizada');
  }

  generateDailySummary() {
    return {
      systemHealth: this.getSystemHealth(),
      totalRequests: this.metrics.requests.total,
      avgResponseTime: this.metrics.requests.avgResponseTime,
      errorRate: this.metrics.requests.total > 0 ? 
        (this.metrics.requests.failed / this.metrics.requests.total) * 100 : 0,
      cacheHitRate: this.metrics.cache.hitRate,
      slowQueries: this.metrics.database.slowQueries,
      activeAlerts: this.activeAlerts.size
    };
  }

  getTopIssues() {
    const issues = [];

    // Top erros
    const sortedErrors = Array.from(this.metrics.errors.byType.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    for (const [type, count] of sortedErrors) {
      issues.push({
        type: 'ERROR',
        description: `${type}: ${count} ocorrências`,
        severity: count > 50 ? 'HIGH' : count > 20 ? 'MEDIUM' : 'LOW'
      });
    }

    return issues;
  }

  generateDailyRecommendations() {
    const recommendations = this.generateRecommendations();
    
    // Adicionar recomendações específicas do dia
    const performance = this.calculatePerformanceScore();
    
    if (performance.score < 80) {
      recommendations.unshift({
        type: 'URGENT',
        priority: 'HIGH',
        message: 'Performance geral abaixo do esperado',
        action: 'comprehensive_optimization'
      });
    }

    return recommendations;
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;
