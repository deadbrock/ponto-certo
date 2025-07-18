const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        this.currentLevel = process.env.LOG_LEVEL || 'INFO';
        this.logDir = path.join(__dirname, '../../logs');
        this.createLogDirectory();
    }

    createLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    shouldLog(level) {
        return this.logLevels[level] <= this.logLevels[this.currentLevel];
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaString = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level}] ${message}${metaString}`;
    }

    writeToFile(level, formattedMessage) {
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `${today}.log`);
        const errorLogFile = path.join(this.logDir, `${today}-error.log`);
        
        // Log tudo no arquivo principal
        fs.appendFileSync(logFile, formattedMessage + '\n');
        
        // Log erros e warnings em arquivo separado
        if (level === 'ERROR' || level === 'WARN') {
            fs.appendFileSync(errorLogFile, formattedMessage + '\n');
        }
    }

    log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;

        const formattedMessage = this.formatMessage(level, message, meta);
        
        // Output no console com cores
        this.consoleOutput(level, formattedMessage);
        
        // Escrever em arquivo
        this.writeToFile(level, formattedMessage);
    }

    consoleOutput(level, message) {
        const colors = {
            ERROR: '\x1b[31m', // Vermelho
            WARN: '\x1b[33m',  // Amarelo
            INFO: '\x1b[36m',  // Ciano
            DEBUG: '\x1b[90m'  // Cinza
        };
        const reset = '\x1b[0m';
        
        console.log(`${colors[level] || ''}${message}${reset}`);
    }

    error(message, meta = {}) {
        this.log('ERROR', message, meta);
    }

    warn(message, meta = {}) {
        this.log('WARN', message, meta);
    }

    info(message, meta = {}) {
        this.log('INFO', message, meta);
    }

    debug(message, meta = {}) {
        this.log('DEBUG', message, meta);
    }

    // Logs específicos para o sistema de ponto
    pontoRegistrado(colaborador, tipo, dados = {}) {
        this.info(`Ponto registrado: ${colaborador} - ${tipo}`, {
            colaborador,
            tipo_registro: tipo,
            ...dados
        });
    }

    erroValidacao(colaborador, erro, dados = {}) {
        this.warn(`Erro de validação: ${colaborador} - ${erro}`, {
            colaborador,
            erro,
            ...dados
        });
    }

    gpsCapturado(colaborador, latitude, longitude) {
        this.debug('GPS capturado', {
            colaborador,
            latitude,
            longitude
        });
    }

    reconhecimentoFacial(resultado, confianca = null, colaborador = null) {
        this.info(`Reconhecimento facial: ${resultado}`, {
            resultado,
            confianca,
            colaborador
        });
    }

    operacaoLenta(operacao, duracao, limite) {
        this.warn(`Operação lenta detectada: ${operacao}`, {
            operacao,
            duracao_ms: duracao,
            limite_ms: limite
        });
    }

    // Capturar erros não tratados
    setupUncaughtExceptionHandler() {
        process.on('uncaughtException', (error) => {
            this.error('Erro não capturado', {
                error: error.message,
                stack: error.stack
            });
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.error('Promise rejeitada não tratada', {
                reason: reason?.message || reason,
                stack: reason?.stack
            });
        });
    }

    // Middleware para Express
    getExpressMiddleware() {
        return (req, res, next) => {
            const start = Date.now();
            
            res.on('finish', () => {
                const duration = Date.now() - start;
                const logData = {
                    method: req.method,
                    url: req.url,
                    status: res.statusCode,
                    duration_ms: duration,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                };

                if (res.statusCode >= 400) {
                    this.warn(`HTTP ${res.statusCode}: ${req.method} ${req.url}`, logData);
                } else {
                    this.info(`HTTP ${res.statusCode}: ${req.method} ${req.url}`, logData);
                }
            });
            
            next();
        };
    }

    // Obter logs recentes
    getRecentLogs(lines = 100) {
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `${today}.log`);
        
        if (!fs.existsSync(logFile)) {
            return [];
        }

        const content = fs.readFileSync(logFile, 'utf8');
        const allLines = content.split('\n').filter(line => line.trim());
        
        return allLines.slice(-lines);
    }

    // Obter estatísticas dos logs
    getLogStats(days = 7) {
        const stats = {
            totalLogs: 0,
            errors: 0,
            warnings: 0,
            info: 0,
            debug: 0,
            days: []
        };

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            const logFile = path.join(this.logDir, `${dateString}.log`);

            if (fs.existsSync(logFile)) {
                const content = fs.readFileSync(logFile, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());
                
                const dayStats = {
                    date: dateString,
                    total: lines.length,
                    errors: lines.filter(line => line.includes('[ERROR]')).length,
                    warnings: lines.filter(line => line.includes('[WARN]')).length,
                    info: lines.filter(line => line.includes('[INFO]')).length,
                    debug: lines.filter(line => line.includes('[DEBUG]')).length
                };

                stats.days.push(dayStats);
                stats.totalLogs += dayStats.total;
                stats.errors += dayStats.errors;
                stats.warnings += dayStats.warnings;
                stats.info += dayStats.info;
                stats.debug += dayStats.debug;
            }
        }

        return stats;
    }

    // Limpar logs antigos
    cleanOldLogs(daysToKeep = 30) {
        const files = fs.readdirSync(this.logDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        let deletedCount = 0;
        files.forEach(file => {
            const filePath = path.join(this.logDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime < cutoffDate) {
                fs.unlinkSync(filePath);
                deletedCount++;
            }
        });

        this.info(`Limpeza de logs antiga: ${deletedCount} arquivos removidos`);
        return deletedCount;
    }

    // Relatório de logs
    generateReport() {
        const stats = this.getLogStats();
        const recentLogs = this.getRecentLogs(10);
        
        return {
            timestamp: new Date().toISOString(),
            currentLevel: this.currentLevel,
            statistics: stats,
            recentLogs: recentLogs.map(log => {
                const match = log.match(/\[(.*?)\] \[(.*?)\] (.*)/);
                if (match) {
                    return {
                        timestamp: match[1],
                        level: match[2],
                        message: match[3]
                    };
                }
                return { raw: log };
            })
        };
    }
}

// Instância singleton
const logger = new Logger();

// Configurar handlers para erros não capturados
logger.setupUncaughtExceptionHandler();

module.exports = logger; 