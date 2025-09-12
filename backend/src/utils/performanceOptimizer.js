/**
 * 🚀 OTIMIZADOR DE PERFORMANCE
 * 
 * Sistema completo de otimização de performance para o sistema de ponto digital
 * incluindo cache, otimização de queries, monitoramento e análise
 */

const NodeCache = require('node-cache');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class PerformanceOptimizer {
  constructor() {
    // Cache em memória com TTL configurável
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutos padrão
      checkperiod: 60, // Verifica expiração a cada minuto
      useClones: false, // Melhor performance
      maxKeys: 1000 // Limite de chaves
    });

    // Cache específico para diferentes tipos de dados
    this.caches = {
      queries: new NodeCache({ stdTTL: 300, maxKeys: 500 }), // Queries SQL
      dashboard: new NodeCache({ stdTTL: 60, maxKeys: 100 }), // Dashboard data
      reports: new NodeCache({ stdTTL: 900, maxKeys: 200 }), // Relatórios (15min)
      analytics: new NodeCache({ stdTTL: 600, maxKeys: 150 }), // Analytics (10min)
      auth: new NodeCache({ stdTTL: 1800, maxKeys: 1000 }), // Auth tokens (30min)
      static: new NodeCache({ stdTTL: 3600, maxKeys: 50 }) // Dados estáticos (1h)
    };

    // Métricas de performance
    this.metrics = {
      queryTimes: new Map(),
      cacheHits: 0,
      cacheMisses: 0,
      totalQueries: 0,
      slowQueries: []
    };

    // Configurações
    this.config = {
      slowQueryThreshold: 1000, // ms
      maxSlowQueries: 100,
      enableQueryLogging: process.env.NODE_ENV === 'development',
      enableMetrics: true
    };

    // Inicializar sistema
    this.setupEventListeners();
  }

  /**
   * Configurar listeners de eventos
   */
  setupEventListeners() {
    // Limpar métricas antigas periodicamente
    setInterval(() => {
      this.cleanupMetrics();
    }, 300000); // 5 minutos

    // Log de estatísticas a cada 10 minutos
    setInterval(() => {
      this.logCacheStats();
    }, 600000); // 10 minutos
  }

  /**
   * Middleware de cache para queries
   */
  cacheMiddleware(cacheType = 'queries', ttl = null) {
    return (req, res, next) => {
      const cache = this.caches[cacheType] || this.cache;
      const cacheKey = this.generateCacheKey(req);
      
      // Tentar buscar no cache
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        this.metrics.cacheHits++;
        
        if (this.config.enableQueryLogging) {
          console.log(`🎯 CACHE HIT: ${cacheKey}`);
        }
        
        // Adicionar headers de cache
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Cache-Type': cacheType
        });
        
        return res.json(cachedData);
      }

      this.metrics.cacheMisses++;
      
      // Interceptar resposta para cachear
      const originalJson = res.json;
      res.json = (data) => {
        if (res.statusCode === 200 && data.success !== false) {
          const cacheTime = ttl || cache.options.stdTTL;
          cache.set(cacheKey, data, cacheTime);
          
          if (this.config.enableQueryLogging) {
            console.log(`💾 CACHED: ${cacheKey} (TTL: ${cacheTime}s)`);
          }
        }
        
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'X-Cache-Type': cacheType
        });
        
        return originalJson.call(res, data);
      };

      next();
    };
  }

  /**
   * Wrapper para queries otimizadas
   */
  async optimizedQuery(db, query, params = [], options = {}) {
    const {
      cacheKey = null,
      cacheTTL = 300,
      enableCache = true,
      queryName = 'unknown'
    } = options;

    const startTime = Date.now();
    this.metrics.totalQueries++;

    try {
      // Verificar cache se habilitado
      if (enableCache && cacheKey) {
        const cachedResult = this.caches.queries.get(cacheKey);
        if (cachedResult) {
          this.metrics.cacheHits++;
          return cachedResult;
        }
      }

      // Executar query
      const result = await db.query(query, params);
      const executionTime = Date.now() - startTime;

      // Registrar métricas
      this.recordQueryMetrics(queryName, executionTime, query);

      // Cachear resultado se habilitado
      if (enableCache && cacheKey && result.rows) {
        this.caches.queries.set(cacheKey, result, cacheTTL);
      }

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordQueryMetrics(queryName, executionTime, query, error);
      throw error;
    }
  }

  /**
   * Otimizar queries do dashboard
   */
  async optimizeDashboardQueries(db) {
    const cacheKey = 'dashboard_stats';
    const cached = this.caches.dashboard.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Query otimizada combinada para dashboard
    const optimizedQuery = `
      WITH 
      colaboradores_stats AS (
        SELECT COUNT(*) as total_colaboradores
        FROM colaboradores
      ),
      registros_hoje AS (
        SELECT COUNT(*) as total_hoje
        FROM registros_ponto 
        WHERE DATE(data_hora) = CURRENT_DATE
      ),
      registros_ontem AS (
        SELECT COUNT(*) as total_ontem
        FROM registros_ponto 
        WHERE DATE(data_hora) = CURRENT_DATE - INTERVAL '1 day'
      ),
      sem_registro_hoje AS (
        SELECT COUNT(*) as total_sem_registro
        FROM colaboradores c
        WHERE NOT EXISTS (
          SELECT 1 FROM registros_ponto rp 
          WHERE rp.colaborador_id = c.id 
          AND DATE(rp.data_hora) = CURRENT_DATE
        )
      )
      SELECT 
        cs.total_colaboradores,
        rh.total_hoje,
        ro.total_ontem,
        sr.total_sem_registro
      FROM colaboradores_stats cs
      CROSS JOIN registros_hoje rh
      CROSS JOIN registros_ontem ro
      CROSS JOIN sem_registro_hoje sr
    `;

    try {
      const result = await this.optimizedQuery(db, optimizedQuery, [], {
        cacheKey,
        cacheTTL: 60, // 1 minuto para dashboard
        queryName: 'dashboard_combined'
      });

      const stats = result.rows[0];
      const processedStats = {
        colaboradores_ativos: parseInt(stats.total_colaboradores) || 0,
        registros_hoje: parseInt(stats.total_hoje) || 0,
        registros_ontem: parseInt(stats.total_ontem) || 0,
        sem_registro_hoje: parseInt(stats.total_sem_registro) || 0,
        trend_registros: this.calculateTrend(stats.total_hoje, stats.total_ontem)
      };

      this.caches.dashboard.set(cacheKey, processedStats, 60);
      return processedStats;

    } catch (error) {
      console.error('❌ Erro na query otimizada do dashboard:', error);
      throw error;
    }
  }

  /**
   * Otimizar queries de relatórios
   */
  async optimizeReportQueries(db, params) {
    const { data_inicio, data_fim, colaborador_id, tablet_id } = params;
    const cacheKey = this.generateReportCacheKey(params);
    
    // Query otimizada com índices
    let query = `
      SELECT 
        rp.id,
        rp.data_hora,
        rp.latitude,
        rp.longitude,
        rp.tablet_id,
        rp.tablet_name,
        rp.tablet_location,
        c.nome as colaborador_nome,
        c.cpf as colaborador_cpf,
        c.perfil as colaborador_perfil
      FROM registros_ponto rp
      INNER JOIN colaboradores c ON rp.colaborador_id = c.id
    `;

    const conditions = [];
    const queryParams = [];
    let paramIndex = 1;

    if (data_inicio) {
      conditions.push(`rp.data_hora >= $${paramIndex}`);
      queryParams.push(data_inicio);
      paramIndex++;
    }

    if (data_fim) {
      conditions.push(`rp.data_hora <= $${paramIndex}`);
      queryParams.push(data_fim + ' 23:59:59');
      paramIndex++;
    }

    if (colaborador_id) {
      conditions.push(`rp.colaborador_id = $${paramIndex}`);
      queryParams.push(colaborador_id);
      paramIndex++;
    }

    if (tablet_id) {
      conditions.push(`rp.tablet_id = $${paramIndex}`);
      queryParams.push(tablet_id);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY rp.data_hora DESC LIMIT 10000'; // Limite de segurança

    return await this.optimizedQuery(db, query, queryParams, {
      cacheKey,
      cacheTTL: 900, // 15 minutos
      queryName: 'report_optimized'
    });
  }

  /**
   * Otimizar queries de analytics
   */
  async optimizeAnalyticsQueries(db, type, period = 30) {
    const cacheKey = `analytics_${type}_${period}d`;
    
    let query;
    
    switch (type) {
      case 'registros_por_hora':
        query = `
          SELECT 
            EXTRACT(HOUR FROM data_hora) as hora,
            COUNT(*) as total_registros
          FROM registros_ponto 
          WHERE data_hora >= CURRENT_DATE - INTERVAL '${period} days'
          GROUP BY EXTRACT(HOUR FROM data_hora)
          ORDER BY hora
        `;
        break;

      case 'ranking_colaboradores':
        query = `
          SELECT 
            c.nome,
            COUNT(rp.id) as total_registros,
            COUNT(CASE WHEN EXTRACT(HOUR FROM rp.data_hora) <= 8 
                       AND EXTRACT(MINUTE FROM rp.data_hora) <= 15 
                       THEN 1 END) as pontuais,
            ROUND(
              COUNT(CASE WHEN EXTRACT(HOUR FROM rp.data_hora) <= 8 
                         AND EXTRACT(MINUTE FROM rp.data_hora) <= 15 
                         THEN 1 END) * 100.0 / NULLIF(COUNT(rp.id), 0), 
              2
            ) as pontualidade_pct
          FROM colaboradores c
          LEFT JOIN registros_ponto rp ON c.id = rp.colaborador_id
            AND rp.data_hora >= CURRENT_DATE - INTERVAL '${period} days'
          GROUP BY c.id, c.nome
          HAVING COUNT(rp.id) > 0
          ORDER BY total_registros DESC, pontualidade_pct DESC
          LIMIT 10
        `;
        break;

      case 'estatisticas_gerais':
        query = `
          WITH stats AS (
            SELECT 
              COUNT(*) as total_registros,
              COUNT(DISTINCT colaborador_id) as colaboradores_ativos,
              COUNT(DISTINCT DATE(data_hora)) as dias_atividade,
              AVG(EXTRACT(HOUR FROM data_hora) + EXTRACT(MINUTE FROM data_hora)/60.0) as hora_media
            FROM registros_ponto 
            WHERE data_hora >= CURRENT_DATE - INTERVAL '${period} days'
          )
          SELECT 
            total_registros,
            colaboradores_ativos,
            dias_atividade,
            ROUND(hora_media, 2) as hora_media_entrada,
            ROUND(total_registros::decimal / NULLIF(dias_atividade, 0), 1) as media_registros_dia
          FROM stats
        `;
        break;

      default:
        throw new Error(`Tipo de analytics não suportado: ${type}`);
    }

    return await this.optimizedQuery(db, query, [], {
      cacheKey,
      cacheTTL: 600, // 10 minutos
      queryName: `analytics_${type}`
    });
  }

  /**
   * Gerar chave de cache para requisição
   */
  generateCacheKey(req) {
    const baseKey = `${req.method}_${req.path}`;
    const queryString = JSON.stringify(req.query);
    const bodyString = req.method !== 'GET' ? JSON.stringify(req.body) : '';
    
    const hash = crypto
      .createHash('md5')
      .update(baseKey + queryString + bodyString)
      .digest('hex');
      
    return `${baseKey}_${hash}`.substring(0, 50);
  }

  /**
   * Gerar chave de cache para relatórios
   */
  generateReportCacheKey(params) {
    const keyData = JSON.stringify(params);
    const hash = crypto.createHash('md5').update(keyData).digest('hex');
    return `report_${hash}`;
  }

  /**
   * Registrar métricas de query
   */
  recordQueryMetrics(queryName, executionTime, query, error = null) {
    // Registrar tempo de execução
    if (!this.metrics.queryTimes.has(queryName)) {
      this.metrics.queryTimes.set(queryName, []);
    }
    
    const times = this.metrics.queryTimes.get(queryName);
    times.push(executionTime);
    
    // Manter apenas últimas 100 execuções
    if (times.length > 100) {
      times.shift();
    }

    // Registrar queries lentas
    if (executionTime > this.config.slowQueryThreshold) {
      this.metrics.slowQueries.push({
        queryName,
        executionTime,
        query: query.substring(0, 200) + '...',
        timestamp: new Date(),
        error: error?.message
      });

      // Manter apenas últimas queries lentas
      if (this.metrics.slowQueries.length > this.config.maxSlowQueries) {
        this.metrics.slowQueries.shift();
      }

      if (this.config.enableQueryLogging) {
        console.warn(`🐌 SLOW QUERY (${executionTime}ms): ${queryName}`);
      }
    }
  }

  /**
   * Calcular tendência
   */
  calculateTrend(current, previous) {
    if (previous === 0) return '+0%';
    const change = ((current - previous) / previous * 100).toFixed(1);
    return change >= 0 ? `+${change}%` : `${change}%`;
  }

  /**
   * Limpar cache específico
   */
  clearCache(cacheType = null, pattern = null) {
    if (cacheType && this.caches[cacheType]) {
      if (pattern) {
        // Limpar chaves que correspondem ao padrão
        const keys = this.caches[cacheType].keys();
        keys.forEach(key => {
          if (key.includes(pattern)) {
            this.caches[cacheType].del(key);
          }
        });
      } else {
        // Limpar todo o cache do tipo
        this.caches[cacheType].flushAll();
      }
    } else {
      // Limpar todos os caches
      Object.values(this.caches).forEach(cache => cache.flushAll());
      this.cache.flushAll();
    }
  }

  /**
   * Obter estatísticas de performance
   */
  getPerformanceStats() {
    const stats = {
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate: this.metrics.cacheHits + this.metrics.cacheMisses > 0 ? 
          Math.round((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100) : 0
      },
      queries: {
        total: this.metrics.totalQueries,
        slow: this.metrics.slowQueries.length,
        avgTimes: {}
      },
      cacheStats: {}
    };

    // Calcular tempos médios por query
    for (const [queryName, times] of this.metrics.queryTimes) {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        stats.queries.avgTimes[queryName] = Math.round(avg);
      }
    }

    // Estatísticas por cache
    for (const [type, cache] of Object.entries(this.caches)) {
      stats.cacheStats[type] = {
        keys: cache.keys().length,
        hits: cache.getStats().hits || 0,
        misses: cache.getStats().misses || 0
      };
    }

    return stats;
  }

  /**
   * Obter queries mais lentas
   */
  getSlowQueries(limit = 10) {
    return this.metrics.slowQueries
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  /**
   * Gerar relatório de performance
   */
  generatePerformanceReport() {
    const stats = this.getPerformanceStats();
    const slowQueries = this.getSlowQueries();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        cacheHitRate: stats.cache.hitRate,
        totalQueries: stats.queries.total,
        slowQueries: stats.queries.slow,
        avgQueryTime: this.calculateOverallAvgTime()
      },
      cacheStats: stats.cacheStats,
      slowQueries,
      recommendations: this.generateRecommendations(stats, slowQueries)
    };

    return report;
  }

  /**
   * Calcular tempo médio geral
   */
  calculateOverallAvgTime() {
    let totalTime = 0;
    let totalQueries = 0;

    for (const times of this.metrics.queryTimes.values()) {
      totalTime += times.reduce((a, b) => a + b, 0);
      totalQueries += times.length;
    }

    return totalQueries > 0 ? Math.round(totalTime / totalQueries) : 0;
  }

  /**
   * Gerar recomendações
   */
  generateRecommendations(stats, slowQueries) {
    const recommendations = [];

    if (stats.cache.hitRate < 70) {
      recommendations.push({
        priority: 'HIGH',
        type: 'CACHE',
        message: `Taxa de cache hit baixa: ${stats.cache.hitRate}%`,
        action: 'Revisar estratégia de cache e TTL'
      });
    }

    if (slowQueries.length > 10) {
      recommendations.push({
        priority: 'HIGH',
        type: 'QUERY',
        message: `${slowQueries.length} queries lentas detectadas`,
        action: 'Otimizar queries e adicionar índices'
      });
    }

    const avgTime = this.calculateOverallAvgTime();
    if (avgTime > 500) {
      recommendations.push({
        priority: 'MEDIUM',
        type: 'PERFORMANCE',
        message: `Tempo médio de query alto: ${avgTime}ms`,
        action: 'Otimizar queries mais frequentes'
      });
    }

    return recommendations;
  }

  /**
   * Limpar métricas antigas
   */
  cleanupMetrics() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 horas

    // Limpar queries lentas antigas
    this.metrics.slowQueries = this.metrics.slowQueries.filter(
      query => new Date(query.timestamp).getTime() > cutoff
    );

    // Limpar tempos de query antigos (manter apenas últimos 100)
    for (const [queryName, times] of this.metrics.queryTimes) {
      if (times.length > 100) {
        times.splice(0, times.length - 100);
      }
    }
  }

  /**
   * Log de estatísticas de cache
   */
  logCacheStats() {
    if (!this.config.enableQueryLogging) return;

    const stats = this.getPerformanceStats();
    console.log('📊 PERFORMANCE STATS:');
    console.log(`   Cache Hit Rate: ${stats.cache.hitRate}%`);
    console.log(`   Total Queries: ${stats.queries.total}`);
    console.log(`   Slow Queries: ${stats.queries.slow}`);
    console.log(`   Avg Query Time: ${this.calculateOverallAvgTime()}ms`);
  }

  /**
   * Middleware de monitoramento de performance
   */
  performanceMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Interceptar resposta
      const originalSend = res.send;
      res.send = function(data) {
        const responseTime = Date.now() - startTime;
        
        // Adicionar header de tempo de resposta
        res.set('X-Response-Time', `${responseTime}ms`);
        
        // Log de requests lentos
        if (responseTime > 2000) { // 2 segundos
          console.warn(`🐌 SLOW REQUEST: ${req.method} ${req.path} - ${responseTime}ms`);
        }
        
        return originalSend.call(this, data);
      };
      
      next();
    };
  }

  /**
   * Salvar relatório de performance
   */
  savePerformanceReport() {
    try {
      const report = this.generatePerformanceReport();
      const reportPath = path.join(__dirname, '..', 'logs', 'performance');
      
      if (!fs.existsSync(reportPath)) {
        fs.mkdirSync(reportPath, { recursive: true });
      }
      
      const filename = `performance-${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(reportPath, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
      console.log(`📊 Relatório de performance salvo: ${filepath}`);
      
      return filepath;
    } catch (error) {
      console.error('❌ Erro ao salvar relatório de performance:', error);
    }
  }
}

// Singleton instance
const performanceOptimizer = new PerformanceOptimizer();

module.exports = performanceOptimizer;
