const NodeCache = require('node-cache');
const performanceMonitor = require('./PerformanceMonitor');

class CacheService {
    constructor() {
        // Cache principal com TTL de 5 minutos
        this.cache = new NodeCache({ 
            stdTTL: 300, // 5 minutos
            checkperiod: 60, // verificar expiração a cada 60 segundos
            useClones: false // melhor performance, mas cuidado com mutações
        });

        // Cache de longa duração para dados que mudam pouco
        this.longCache = new NodeCache({ 
            stdTTL: 1800, // 30 minutos
            checkperiod: 120
        });

        // Cache de colaboradores (dados estáticos)
        this.colaboradorCache = new NodeCache({ 
            stdTTL: 3600, // 1 hora
            checkperiod: 300
        });

        // Estatísticas de cache
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };

        this.setupEventListeners();
    }

    // Configurar listeners para estatísticas
    setupEventListeners() {
        this.cache.on('hit', (key) => {
            this.stats.hits++;
            console.log(`🎯 Cache hit: ${key}`);
        });

        this.cache.on('miss', (key) => {
            this.stats.misses++;
            console.log(`❌ Cache miss: ${key}`);
        });

        this.cache.on('set', (key) => {
            this.stats.sets++;
        });

        this.cache.on('del', (key) => {
            this.stats.deletes++;
        });
    }

    // Obter valor do cache
    get(key, cacheType = 'default') {
        const timer = performanceMonitor.startTimer('cache_get');
        
        try {
            let cache = this.cache;
            if (cacheType === 'long') cache = this.longCache;
            if (cacheType === 'colaborador') cache = this.colaboradorCache;

            const value = cache.get(key);
            timer.end();
            
            if (value !== undefined) {
                this.stats.hits++;
                console.log(`🎯 Cache hit: ${key}`);
                return value;
            } else {
                this.stats.misses++;
                console.log(`❌ Cache miss: ${key}`);
                return null;
            }
        } catch (error) {
            timer.end();
            console.error('Erro ao obter cache:', error);
            return null;
        }
    }

    // Definir valor no cache
    set(key, value, ttl = null, cacheType = 'default') {
        const timer = performanceMonitor.startTimer('cache_set');
        
        try {
            let cache = this.cache;
            if (cacheType === 'long') cache = this.longCache;
            if (cacheType === 'colaborador') cache = this.colaboradorCache;

            const success = cache.set(key, value, ttl);
            timer.end();
            
            if (success) {
                this.stats.sets++;
                console.log(`💾 Cache set: ${key} (TTL: ${ttl || 'default'})`);
            }
            
            return success;
        } catch (error) {
            timer.end();
            console.error('Erro ao definir cache:', error);
            return false;
        }
    }

    // Deletar valor do cache
    delete(key, cacheType = 'default') {
        try {
            let cache = this.cache;
            if (cacheType === 'long') cache = this.longCache;
            if (cacheType === 'colaborador') cache = this.colaboradorCache;

            const deleted = cache.del(key);
            if (deleted > 0) {
                this.stats.deletes++;
                console.log(`🗑️ Cache delete: ${key}`);
            }
            return deleted > 0;
        } catch (error) {
            console.error('Erro ao deletar cache:', error);
            return false;
        }
    }

    // Limpar cache por padrão
    deletePattern(pattern, cacheType = 'default') {
        try {
            let cache = this.cache;
            if (cacheType === 'long') cache = this.longCache;
            if (cacheType === 'colaborador') cache = this.colaboradorCache;

            const keys = cache.keys();
            const matchingKeys = keys.filter(key => key.includes(pattern));
            
            let deletedCount = 0;
            matchingKeys.forEach(key => {
                if (cache.del(key)) {
                    deletedCount++;
                }
            });

            console.log(`🗑️ Cache pattern delete: ${pattern} (${deletedCount} keys)`);
            return deletedCount;
        } catch (error) {
            console.error('Erro ao deletar padrão do cache:', error);
            return 0;
        }
    }

    // Wrapper para funções com cache automático
    async wrap(key, fetchFunction, ttl = null, cacheType = 'default') {
        // Tentar obter do cache primeiro
        const cached = this.get(key, cacheType);
        if (cached !== null) {
            return cached;
        }

        // Se não encontrou no cache, executar função e cachear resultado
        try {
            const result = await fetchFunction();
            this.set(key, result, ttl, cacheType);
            return result;
        } catch (error) {
            console.error(`Erro ao executar função para cache ${key}:`, error);
            throw error;
        }
    }

    // Cache específico para colaboradores
    async getColaborador(colaborador_id) {
        const key = `colaborador_${colaborador_id}`;
        return this.get(key, 'colaborador');
    }

    setColaborador(colaborador_id, data) {
        const key = `colaborador_${colaborador_id}`;
        return this.set(key, data, 3600, 'colaborador'); // 1 hora
    }

    // Cache para registros do dia
    async getRegistrosDia(colaborador_id, data = null) {
        const dataKey = data || new Date().toISOString().split('T')[0];
        const key = `registros_dia_${colaborador_id}_${dataKey}`;
        return this.get(key);
    }

    setRegistrosDia(colaborador_id, data, registros) {
        const dataKey = data || new Date().toISOString().split('T')[0];
        const key = `registros_dia_${colaborador_id}_${dataKey}`;
        // Cache por menos tempo se for o dia atual (dados podem mudar)
        const ttl = dataKey === new Date().toISOString().split('T')[0] ? 300 : 1800; // 5min hoje, 30min outros dias
        return this.set(key, registros, ttl);
    }

    // Invalidar cache relacionado a um colaborador
    invalidateColaborador(colaborador_id) {
        this.delete(`colaborador_${colaborador_id}`, 'colaborador');
        this.deletePattern(`registros_dia_${colaborador_id}`);
        this.deletePattern(`estatisticas_${colaborador_id}`);
        console.log(`🔄 Cache invalidado para colaborador ${colaborador_id}`);
    }

    // Cache para estatísticas
    async getEstatisticas(colaborador_id, data = null) {
        const dataKey = data || new Date().toISOString().split('T')[0];
        const key = `estatisticas_${colaborador_id}_${dataKey}`;
        return this.get(key, 'long');
    }

    setEstatisticas(colaborador_id, data, estatisticas) {
        const dataKey = data || new Date().toISOString().split('T')[0];
        const key = `estatisticas_${colaborador_id}_${dataKey}`;
        const ttl = dataKey === new Date().toISOString().split('T')[0] ? 600 : 3600; // 10min hoje, 1h outros dias
        return this.set(key, estatisticas, ttl, 'long');
    }

    // Cache para próximo tipo de registro
    getProximoTipo(colaborador_id) {
        const key = `proximo_tipo_${colaborador_id}`;
        return this.get(key);
    }

    setProximoTipo(colaborador_id, proximoTipo) {
        const key = `proximo_tipo_${colaborador_id}`;
        return this.set(key, proximoTipo, 120); // 2 minutos
    }

    invalidateProximoTipo(colaborador_id) {
        this.delete(`proximo_tipo_${colaborador_id}`);
    }

    // Obter estatísticas do cache
    getStats() {
        const cacheStats = {
            default: {
                keys: this.cache.keys().length,
                hits: this.cache.getStats().hits,
                misses: this.cache.getStats().misses
            },
            long: {
                keys: this.longCache.keys().length,
                hits: this.longCache.getStats().hits,
                misses: this.longCache.getStats().misses
            },
            colaborador: {
                keys: this.colaboradorCache.keys().length,
                hits: this.colaboradorCache.getStats().hits,
                misses: this.colaboradorCache.getStats().misses
            }
        };

        const totalHits = cacheStats.default.hits + cacheStats.long.hits + cacheStats.colaborador.hits;
        const totalMisses = cacheStats.default.misses + cacheStats.long.misses + cacheStats.colaborador.misses;
        const hitRate = totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses) * 100).toFixed(2) : 0;

        return {
            ...cacheStats,
            global: {
                totalHits,
                totalMisses,
                hitRate: `${hitRate}%`,
                totalKeys: cacheStats.default.keys + cacheStats.long.keys + cacheStats.colaborador.keys
            }
        };
    }

    // Limpar todos os caches
    flushAll() {
        this.cache.flushAll();
        this.longCache.flushAll();
        this.colaboradorCache.flushAll();
        console.log('🧹 Todos os caches foram limpos');
    }

    // Middleware para invalidação automática de cache
    getInvalidationMiddleware() {
        return (req, res, next) => {
            const originalSend = res.send;
            
            res.send = function(data) {
                // Se foi uma operação de modificação, invalidar caches relacionados
                if (req.method !== 'GET' && req.url.includes('/ponto/')) {
                    const colaborador_id = req.body?.colaborador_id || req.params?.colaborador_id;
                    if (colaborador_id) {
                        cacheService.invalidateColaborador(colaborador_id);
                    }
                }
                
                originalSend.call(this, data);
            };
            
            next();
        };
    }

    // Relatório detalhado do cache
    generateReport() {
        const stats = this.getStats();
        const report = {
            timestamp: new Date().toISOString(),
            performance: {
                hitRate: stats.global.hitRate,
                totalKeys: stats.global.totalKeys,
                totalOperations: stats.global.totalHits + stats.global.totalMisses
            },
            caches: stats,
            recommendations: this.generateRecommendations(stats)
        };

        return report;
    }

    // Gerar recomendações baseadas nas estatísticas
    generateRecommendations(stats) {
        const recommendations = [];
        const hitRate = parseFloat(stats.global.hitRate);

        if (hitRate < 50) {
            recommendations.push('Taxa de acerto baixa - considere ajustar TTL ou estratégia de cache');
        }

        if (stats.global.totalKeys > 1000) {
            recommendations.push('Muitas chaves em cache - considere limpeza periódica ou TTL menor');
        }

        if (hitRate > 90) {
            recommendations.push('Excelente taxa de acerto de cache! Sistema bem otimizado.');
        }

        return recommendations;
    }
}

// Instância singleton
const cacheService = new CacheService();

module.exports = cacheService; 