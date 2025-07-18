const EventEmitter = require('events');

class PerformanceMonitor extends EventEmitter {
    constructor() {
        super();
        this.metrics = new Map();
        this.slowQueries = [];
        this.requestCounts = new Map();
        this.memoryUsage = [];
        this.startTime = Date.now();
        
        // Iniciar monitoramento automático
        this.startMonitoring();
    }

    // Monitorar tempo de execução de operações
    startTimer(operationName) {
        const startTime = process.hrtime.bigint();
        return {
            end: () => {
                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1000000; // em milissegundos
                this.recordMetric(operationName, duration);
                return duration;
            }
        };
    }

    // Registrar métrica de performance
    recordMetric(name, value, unit = 'ms') {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, {
                values: [],
                total: 0,
                count: 0,
                min: Infinity,
                max: -Infinity,
                unit
            });
        }

        const metric = this.metrics.get(name);
        metric.values.push({
            value,
            timestamp: Date.now()
        });
        metric.total += value;
        metric.count++;
        metric.min = Math.min(metric.min, value);
        metric.max = Math.max(metric.max, value);
        metric.average = metric.total / metric.count;

        // Manter apenas os últimos 1000 valores
        if (metric.values.length > 1000) {
            metric.values.shift();
        }

        // Alertar se operação está lenta
        if (value > this.getSlowThreshold(name)) {
            this.recordSlowOperation(name, value);
        }
    }

    // Definir limites para operações lentas
    getSlowThreshold(operationName) {
        const thresholds = {
            'database_query': 1000, // 1 segundo
            'face_recognition': 3000, // 3 segundos
            'gps_capture': 10000, // 10 segundos
            'file_upload': 5000, // 5 segundos
            'api_request': 2000, // 2 segundos
            'default': 1000
        };

        return thresholds[operationName] || thresholds.default;
    }

    // Registrar operação lenta
    recordSlowOperation(operationName, duration) {
        const slowOp = {
            operation: operationName,
            duration,
            timestamp: Date.now(),
            threshold: this.getSlowThreshold(operationName)
        };

        this.slowQueries.push(slowOp);

        // Manter apenas as últimas 100 operações lentas
        if (this.slowQueries.length > 100) {
            this.slowQueries.shift();
        }

        // Emitir evento para logging/alertas
        this.emit('slowOperation', slowOp);
        
        console.warn(`⚠️ Operação lenta detectada: ${operationName} - ${duration}ms (limite: ${slowOp.threshold}ms)`);
    }

    // Contar requisições por endpoint
    recordRequest(endpoint) {
        const current = this.requestCounts.get(endpoint) || 0;
        this.requestCounts.set(endpoint, current + 1);
    }

    // Monitorar uso de memória
    recordMemoryUsage() {
        const memUsage = process.memoryUsage();
        this.memoryUsage.push({
            timestamp: Date.now(),
            rss: memUsage.rss,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external
        });

        // Manter apenas as últimas 1000 medições
        if (this.memoryUsage.length > 1000) {
            this.memoryUsage.shift();
        }

        // Alertar se uso de memória está alto
        const memoryLimitMB = 500; // 500MB
        const currentMemoryMB = memUsage.heapUsed / 1024 / 1024;
        
        if (currentMemoryMB > memoryLimitMB) {
            console.warn(`⚠️ Alto uso de memória: ${currentMemoryMB.toFixed(2)}MB (limite: ${memoryLimitMB}MB)`);
            this.emit('highMemoryUsage', { current: currentMemoryMB, limit: memoryLimitMB });
        }
    }

    // Obter estatísticas resumidas
    getStats() {
        const stats = {
            uptime: Date.now() - this.startTime,
            metrics: {},
            slowOperations: this.slowQueries.length,
            requestCounts: Object.fromEntries(this.requestCounts),
            memory: this.getMemoryStats()
        };

        // Processar métricas
        for (const [name, metric] of this.metrics) {
            stats.metrics[name] = {
                count: metric.count,
                average: Math.round(metric.average * 100) / 100,
                min: metric.min,
                max: metric.max,
                unit: metric.unit,
                recent: metric.values.slice(-10).map(v => v.value) // últimos 10 valores
            };
        }

        return stats;
    }

    // Obter estatísticas de memória
    getMemoryStats() {
        if (this.memoryUsage.length === 0) return null;

        const recent = this.memoryUsage.slice(-10);
        const avgHeapUsed = recent.reduce((sum, m) => sum + m.heapUsed, 0) / recent.length;
        const latest = this.memoryUsage[this.memoryUsage.length - 1];

        return {
            current: {
                rss: Math.round(latest.rss / 1024 / 1024 * 100) / 100, // MB
                heapUsed: Math.round(latest.heapUsed / 1024 / 1024 * 100) / 100, // MB
                heapTotal: Math.round(latest.heapTotal / 1024 / 1024 * 100) / 100 // MB
            },
            average: {
                heapUsed: Math.round(avgHeapUsed / 1024 / 1024 * 100) / 100 // MB
            }
        };
    }

    // Obter operações mais lentas
    getSlowOperations(limit = 10) {
        return this.slowQueries
            .slice(-limit)
            .sort((a, b) => b.duration - a.duration)
            .map(op => ({
                operation: op.operation,
                duration: `${op.duration}ms`,
                timestamp: new Date(op.timestamp).toISOString(),
                threshold: `${op.threshold}ms`
            }));
    }

    // Obter endpoints mais utilizados
    getTopEndpoints(limit = 10) {
        return Array.from(this.requestCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([endpoint, count]) => ({ endpoint, count }));
    }

    // Limpar dados antigos
    clearOldData() {
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 horas

        // Limpar métricas antigas
        for (const metric of this.metrics.values()) {
            metric.values = metric.values.filter(v => v.timestamp > cutoffTime);
        }

        // Limpar operações lentas antigas
        this.slowQueries = this.slowQueries.filter(op => op.timestamp > cutoffTime);

        // Limpar dados de memória antigos
        this.memoryUsage = this.memoryUsage.filter(m => m.timestamp > cutoffTime);
    }

    // Iniciar monitoramento automático
    startMonitoring() {
        // Monitorar memória a cada 30 segundos
        setInterval(() => {
            this.recordMemoryUsage();
        }, 30000);

        // Limpar dados antigos a cada hora
        setInterval(() => {
            this.clearOldData();
        }, 60 * 60 * 1000);

        // Log estatísticas a cada 5 minutos
        setInterval(() => {
            const stats = this.getStats();
            console.log(`📊 Performance Stats - Uptime: ${Math.round(stats.uptime / 1000 / 60)}min, Memory: ${stats.memory?.current?.heapUsed}MB, Slow ops: ${stats.slowOperations}`);
        }, 5 * 60 * 1000);
    }

    // Middleware para Express
    getExpressMiddleware() {
        return (req, res, next) => {
            const timer = this.startTimer('api_request');
            const originalSend = res.send;
            
            // Registrar endpoint
            this.recordRequest(`${req.method} ${req.route?.path || req.path}`);
            
            // Override do método send para capturar quando a resposta é enviada
            res.send = function(data) {
                timer.end();
                originalSend.call(this, data);
            };
            
            next();
        };
    }

    // Wrapper para queries de banco
    wrapDatabaseQuery(queryFunction) {
        return async (...args) => {
            const timer = this.startTimer('database_query');
            try {
                const result = await queryFunction.apply(this, args);
                timer.end();
                return result;
            } catch (error) {
                timer.end();
                throw error;
            }
        };
    }

    // Gerar relatório detalhado
    generateReport() {
        const stats = this.getStats();
        const report = {
            timestamp: new Date().toISOString(),
            uptime: `${Math.round(stats.uptime / 1000 / 60)} minutos`,
            performance: {
                totalMetrics: Object.keys(stats.metrics).length,
                slowOperations: stats.slowOperations,
                memory: stats.memory
            },
            topEndpoints: this.getTopEndpoints(5),
            slowestOperations: this.getSlowOperations(5),
            metrics: stats.metrics,
            recommendations: this.generateRecommendations(stats)
        };

        return report;
    }

    // Gerar recomendações de otimização
    generateRecommendations(stats) {
        const recommendations = [];

        // Verificar operações lentas frequentes
        if (stats.slowOperations > 10) {
            recommendations.push('Considere otimizar as operações mais lentas ou adicionar cache');
        }

        // Verificar uso de memória
        if (stats.memory?.current?.heapUsed > 300) {
            recommendations.push('Alto uso de memória detectado - considere otimizar ou aumentar recursos');
        }

        // Verificar queries de banco
        const dbMetric = stats.metrics['database_query'];
        if (dbMetric && dbMetric.average > 500) {
            recommendations.push('Queries de banco lentas - considere adicionar índices ou otimizar consultas');
        }

        // Verificar reconhecimento facial
        const faceMetric = stats.metrics['face_recognition'];
        if (faceMetric && faceMetric.average > 2000) {
            recommendations.push('Reconhecimento facial lento - considere otimizar algoritmo ou usar API externa');
        }

        return recommendations;
    }
}

// Instância singleton
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor; 