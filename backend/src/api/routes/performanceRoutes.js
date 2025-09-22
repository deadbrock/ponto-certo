const express = require('express');
const router = express.Router();
const performanceMonitor = require('../../utils/performanceMonitor');
const performanceOptimizer = require('../../utils/performanceOptimizer');
const cacheManager = require('../../utils/cacheManager');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');

// Todas as rotas de performance requerem autenticação de admin
router.use(authMiddleware);
router.use(requireAdmin);

/**
 * @route GET /api/performance/dashboard
 * @desc Obter dashboard de performance em tempo real
 * @access Admin only
 */
router.get('/dashboard', (req, res) => {
  try {
    const stats = performanceMonitor.getStats();
    const cacheStats = cacheManager.getStats();
    const performanceStats = performanceOptimizer.getPerformanceStats();
    
    res.json({
      success: true,
      dashboard: {
        realTime: stats,
        cache: cacheStats,
        optimizer: performanceStats,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Erro ao obter dashboard de performance:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/performance/metrics
 * @desc Obter métricas detalhadas de performance
 * @access Admin only
 */
router.get('/metrics', (req, res) => {
  try {
    const { period = 'current', type = 'all' } = req.query;
    
    let metrics;
    
    if (period === 'hourly') {
      metrics = performanceMonitor.history.hourly.slice(-24); // Últimas 24 horas
    } else if (period === 'daily') {
      metrics = performanceMonitor.history.daily.slice(-30); // Últimos 30 dias
    } else {
      metrics = performanceMonitor.getStats();
    }
    
    res.json({
      success: true,
      metrics,
      period,
      type
    });
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/performance/alerts
 * @desc Obter alertas de performance ativos
 * @access Admin only
 */
router.get('/alerts', (req, res) => {
  try {
    const { severity, acknowledged } = req.query;
    
    let alerts = Array.from(performanceMonitor.activeAlerts.values());
    
    // Filtrar por severidade
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity.toUpperCase());
    }
    
    // Filtrar por status de acknowledgment
    if (acknowledged !== undefined) {
      const isAcknowledged = acknowledged === 'true';
      alerts = alerts.filter(alert => alert.acknowledged === isAcknowledged);
    }
    
    // Ordenar por timestamp (mais recentes primeiro)
    alerts.sort((a, b) => b.timestamp - a.timestamp);
    
    res.json({
      success: true,
      alerts,
      total: alerts.length,
      active: alerts.filter(a => !a.acknowledged).length
    });
  } catch (error) {
    console.error('Erro ao obter alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/performance/alerts/:id/acknowledge
 * @desc Reconhecer alerta de performance
 * @access Admin only
 */
router.post('/alerts/:id/acknowledge', (req, res) => {
  try {
    const { id } = req.params;
    const alert = performanceMonitor.activeAlerts.get(id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alerta não encontrado'
      });
    }
    
    alert.acknowledged = true;
    alert.acknowledgedBy = req.user.id;
    alert.acknowledgedAt = Date.now();
    
    performanceMonitor.activeAlerts.set(id, alert);
    
    res.json({
      success: true,
      message: 'Alerta reconhecido com sucesso',
      alert
    });
  } catch (error) {
    console.error('Erro ao reconhecer alerta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/performance/slow-queries
 * @desc Obter queries mais lentas
 * @access Admin only
 */
router.get('/slow-queries', (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const slowQueries = performanceOptimizer.getSlowQueries(parseInt(limit));
    
    res.json({
      success: true,
      slowQueries,
      total: slowQueries.length
    });
  } catch (error) {
    console.error('Erro ao obter queries lentas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/performance/cache/stats
 * @desc Obter estatísticas detalhadas do cache
 * @access Admin only
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await cacheManager.getStats();
    
    res.json({
      success: true,
      cache: stats
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas do cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/performance/cache/clear
 * @desc Limpar cache (com opções)
 * @access Admin only
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const { type, pattern } = req.body;
    
    let clearedCount;
    
    if (type) {
      clearedCount = await cacheManager.invalidate(null, type);
    } else if (pattern) {
      clearedCount = await cacheManager.invalidate(pattern);
    } else {
      await cacheManager.clear();
      clearedCount = 'all';
    }
    
    // Log da ação
    performanceMonitor.recordError('CACHE_CLEARED', {
      type,
      pattern,
      clearedCount,
      adminUser: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Cache limpo com sucesso',
      clearedCount
    });
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/performance/reports
 * @desc Obter relatórios de performance
 * @access Admin only
 */
router.get('/reports', (req, res) => {
  try {
    const { period = 'hourly', limit = 24 } = req.query;
    
    let reports;
    
    if (period === 'hourly') {
      reports = performanceMonitor.history.hourly.slice(-parseInt(limit));
    } else if (period === 'daily') {
      reports = performanceMonitor.history.daily.slice(-parseInt(limit));
    } else {
      return res.status(400).json({
        success: false,
        error: 'Período inválido. Use: hourly ou daily'
      });
    }
    
    res.json({
      success: true,
      reports,
      period,
      total: reports.length
    });
  } catch (error) {
    console.error('Erro ao obter relatórios:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/performance/optimize
 * @desc Executar otimização manual
 * @access Admin only
 */
router.post('/optimize', async (req, res) => {
  try {
    const { action = 'cache' } = req.body;
    
    let result;
    
    switch (action) {
      case 'cache':
        // Otimizar cache
        await cacheManager.clear();
        result = 'Cache otimizado';
        break;
        
      case 'memory':
        // Forçar garbage collection
        if (global.gc) {
          global.gc();
          result = 'Garbage collection executado';
        } else {
          result = 'Garbage collection não disponível';
        }
        break;
        
      case 'metrics':
        // Reset de métricas
        performanceMonitor.metrics.requests.responseTimes = [];
        performanceMonitor.metrics.database.queryTimes = [];
        result = 'Métricas resetadas';
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Ação inválida. Use: cache, memory, metrics'
        });
    }
    
    // Log da ação
    performanceMonitor.recordError('MANUAL_OPTIMIZATION', {
      action,
      result,
      adminUser: req.user.id
    });
    
    res.json({
      success: true,
      message: result,
      action
    });
  } catch (error) {
    console.error('Erro ao executar otimização:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/performance/recommendations
 * @desc Obter recomendações de otimização
 * @access Admin only
 */
router.get('/recommendations', (req, res) => {
  try {
    const performanceRecommendations = performanceMonitor.generateRecommendations();
    const optimizerReport = performanceOptimizer.generatePerformanceReport();
    
    const consolidatedRecommendations = [
      ...performanceRecommendations,
      ...optimizerReport.recommendations
    ];
    
    // Priorizar recomendações
    const prioritized = consolidatedRecommendations.sort((a, b) => {
      const priorities = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return (priorities[b.priority] || 0) - (priorities[a.priority] || 0);
    });
    
    res.json({
      success: true,
      recommendations: prioritized,
      total: prioritized.length,
      critical: prioritized.filter(r => r.priority === 'CRITICAL').length
    });
  } catch (error) {
    console.error('Erro ao obter recomendações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/performance/health
 * @desc Verificação de saúde do sistema
 * @access Admin only
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      status: performanceMonitor.getSystemHealth(),
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
      performance: performanceMonitor.calculatePerformanceScore()
    };
    
    // Determinar status HTTP baseado na saúde
    let statusCode = 200;
    if (health.status === 'CRITICAL') statusCode = 503;
    else if (health.status === 'POOR') statusCode = 206;
    
    res.status(statusCode).json({
      success: statusCode === 200,
      health
    });
  } catch (error) {
    console.error('Erro ao verificar saúde:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
