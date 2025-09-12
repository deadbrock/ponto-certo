const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const db = require('../config/database');

/**
 * 🔄 SISTEMA DE ROTAÇÃO E LIMPEZA DE LOGS
 * 
 * Gerencia rotação automática de arquivos de log e limpeza de dados antigos
 * Implementa políticas de retenção conforme LGPD
 */

class LogRotationManager {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.maxFiles = 30; // Manter 30 arquivos
    this.retentionPolicies = {
      // Políticas de retenção por categoria (em dias)
      'audit': 2555, // 7 anos (LGPD)
      'security': 2555, // 7 anos
      'biometric': 2555, // 7 anos (dados sensíveis)
      'access': 365, // 1 ano
      'error': 90, // 3 meses
      'debug': 7, // 1 semana
      'general': 30 // 1 mês
    };
    
    this.setupDirectories();
    this.startScheduledTasks();
  }

  /**
   * Configurar diretórios de log
   */
  setupDirectories() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true, mode: 0o700 });
      }
      
      // Criar subdiretórios por categoria
      Object.keys(this.retentionPolicies).forEach(category => {
        const categoryDir = path.join(this.logDir, category);
        if (!fs.existsSync(categoryDir)) {
          fs.mkdirSync(categoryDir, { recursive: true, mode: 0o700 });
        }
      });
      
      console.log('📁 LOG ROTATION: Diretórios configurados');
    } catch (error) {
      console.error('❌ LOG ROTATION ERROR: Falha ao configurar diretórios:', error);
    }
  }

  /**
   * Iniciar tarefas agendadas
   */
  startScheduledTasks() {
    // Rotação de arquivos - a cada hora
    cron.schedule('0 * * * *', () => {
      this.rotateLogFiles().catch(console.error);
    });
    
    // Limpeza de logs antigos - diariamente às 02:00
    cron.schedule('0 2 * * *', () => {
      this.cleanupOldLogs().catch(console.error);
    });
    
    // Limpeza de banco - diariamente às 03:00
    cron.schedule('0 3 * * *', () => {
      this.cleanupDatabaseLogs().catch(console.error);
    });
    
    // Arquivamento - semanalmente aos domingos às 04:00
    cron.schedule('0 4 * * 0', () => {
      this.archiveOldLogs().catch(console.error);
    });
    
    console.log('⏰ LOG ROTATION: Tarefas agendadas iniciadas');
  }

  /**
   * Rotacionar arquivos de log grandes
   */
  async rotateLogFiles() {
    try {
      const categories = Object.keys(this.retentionPolicies);
      let rotatedCount = 0;
      
      for (const category of categories) {
        const categoryDir = path.join(this.logDir, category);
        if (!fs.existsSync(categoryDir)) continue;
        
        const files = fs.readdirSync(categoryDir);
        
        for (const file of files) {
          const filePath = path.join(categoryDir, file);
          const stats = fs.statSync(filePath);
          
          // Rotacionar se arquivo for maior que limite
          if (stats.size > this.maxFileSize) {
            await this.rotateFile(filePath, category);
            rotatedCount++;
          }
        }
      }
      
      if (rotatedCount > 0) {
        console.log(`🔄 LOG ROTATION: ${rotatedCount} arquivos rotacionados`);
      }
      
    } catch (error) {
      console.error('❌ LOG ROTATION ERROR: Falha na rotação:', error);
    }
  }

  /**
   * Rotacionar arquivo específico
   */
  async rotateFile(filePath, category) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dir = path.dirname(filePath);
      const basename = path.basename(filePath, path.extname(filePath));
      const extension = path.extname(filePath);
      
      const rotatedPath = path.join(dir, `${basename}-${timestamp}${extension}`);
      
      // Mover arquivo atual
      fs.renameSync(filePath, rotatedPath);
      
      // Comprimir arquivo rotacionado (opcional)
      if (this.shouldCompress(category)) {
        await this.compressFile(rotatedPath);
      }
      
      // Criar novo arquivo vazio
      fs.writeFileSync(filePath, '', { mode: 0o600 });
      
      console.log(`🔄 Arquivo rotacionado: ${basename} -> ${path.basename(rotatedPath)}`);
      
    } catch (error) {
      console.error('❌ Erro ao rotacionar arquivo:', filePath, error);
    }
  }

  /**
   * Verificar se deve comprimir arquivo
   */
  shouldCompress(category) {
    // Comprimir categorias menos críticas
    return ['debug', 'general', 'access'].includes(category);
  }

  /**
   * Comprimir arquivo usando gzip
   */
  async compressFile(filePath) {
    try {
      const zlib = require('zlib');
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(filePath + '.gz');
      
      await new Promise((resolve, reject) => {
        input.pipe(zlib.createGzip()).pipe(output)
          .on('finish', resolve)
          .on('error', reject);
      });
      
      // Remover arquivo original após compressão
      fs.unlinkSync(filePath);
      
      console.log(`🗜️ Arquivo comprimido: ${path.basename(filePath)}.gz`);
      
    } catch (error) {
      console.error('❌ Erro ao comprimir arquivo:', filePath, error);
    }
  }

  /**
   * Limpar logs antigos dos arquivos
   */
  async cleanupOldLogs() {
    try {
      let cleanedCount = 0;
      
      for (const [category, retentionDays] of Object.entries(this.retentionPolicies)) {
        const categoryDir = path.join(this.logDir, category);
        if (!fs.existsSync(categoryDir)) continue;
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        
        const files = fs.readdirSync(categoryDir);
        
        for (const file of files) {
          const filePath = path.join(categoryDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            cleanedCount++;
            console.log(`🗑️ Log removido: ${category}/${file}`);
          }
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 LOG CLEANUP: ${cleanedCount} arquivos antigos removidos`);
      }
      
    } catch (error) {
      console.error('❌ LOG CLEANUP ERROR: Falha na limpeza:', error);
    }
  }

  /**
   * Limpar logs antigos do banco de dados
   */
  async cleanupDatabaseLogs() {
    try {
      // Remover logs expirados baseado na política de retenção
      const result = await db.query(`
        DELETE FROM logs_auditoria 
        WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days
        AND archived = false
      `);
      
      console.log(`🗄️ DATABASE CLEANUP: ${result.rowCount} logs removidos do banco`);
      
      // Remover alertas antigos resolvidos (manter 90 dias)
      const alertResult = await db.query(`
        DELETE FROM audit_alerts 
        WHERE created_at < NOW() - INTERVAL '90 days'
        AND status IN ('resolved', 'false_positive')
      `);
      
      console.log(`🚨 ALERTS CLEANUP: ${alertResult.rowCount} alertas antigos removidos`);
      
      // Remover sessões antigas (manter 30 dias)
      const sessionResult = await db.query(`
        DELETE FROM audit_sessions 
        WHERE start_time < NOW() - INTERVAL '30 days'
        AND active = false
      `);
      
      console.log(`👤 SESSIONS CLEANUP: ${sessionResult.rowCount} sessões antigas removidas`);
      
    } catch (error) {
      console.error('❌ DATABASE CLEANUP ERROR:', error);
    }
  }

  /**
   * Arquivar logs antigos para storage de longo prazo
   */
  async archiveOldLogs() {
    try {
      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - 365); // Arquivar logs de 1 ano
      
      // Marcar logs como arquivados no banco
      const result = await db.query(`
        UPDATE logs_auditoria 
        SET archived = true 
        WHERE timestamp < $1 
        AND archived = false
        AND category IN ('BUSINESS', 'DATA_ACCESS')
      `, [archiveDate]);
      
      console.log(`📦 ARCHIVE: ${result.rowCount} logs marcados para arquivamento`);
      
      // Em produção, aqui seria implementada a exportação para storage externo
      // (AWS S3, Google Cloud Storage, etc.)
      
    } catch (error) {
      console.error('❌ ARCHIVE ERROR:', error);
    }
  }

  /**
   * Otimizar tabelas de auditoria
   */
  async optimizeTables() {
    try {
      // Vacuum e reindex para PostgreSQL
      await db.query('VACUUM ANALYZE logs_auditoria');
      await db.query('VACUUM ANALYZE audit_alerts');
      await db.query('VACUUM ANALYZE audit_sessions');
      
      console.log('⚡ DATABASE OPTIMIZATION: Tabelas otimizadas');
      
    } catch (error) {
      console.error('❌ OPTIMIZATION ERROR:', error);
    }
  }

  /**
   * Estatísticas de uso de logs
   */
  async getLogStats() {
    try {
      const stats = {
        database: {},
        files: {}
      };
      
      // Estatísticas do banco
      const dbStats = await db.query(`
        SELECT 
          category,
          COUNT(*) as count,
          MIN(timestamp) as oldest,
          MAX(timestamp) as newest,
          pg_size_pretty(pg_total_relation_size('logs_auditoria')) as table_size
        FROM logs_auditoria 
        WHERE archived = false
        GROUP BY category
        ORDER BY count DESC
      `);
      
      stats.database = dbStats.rows;
      
      // Estatísticas dos arquivos
      for (const category of Object.keys(this.retentionPolicies)) {
        const categoryDir = path.join(this.logDir, category);
        if (!fs.existsSync(categoryDir)) continue;
        
        const files = fs.readdirSync(categoryDir);
        let totalSize = 0;
        
        files.forEach(file => {
          const filePath = path.join(categoryDir, file);
          const size = fs.statSync(filePath).size;
          totalSize += size;
        });
        
        stats.files[category] = {
          fileCount: files.length,
          totalSize: totalSize,
          totalSizeFormatted: this.formatBytes(totalSize)
        };
      }
      
      return stats;
      
    } catch (error) {
      console.error('❌ STATS ERROR:', error);
      return null;
    }
  }

  /**
   * Formatar bytes para leitura humana
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Forçar limpeza manual
   */
  async forceCleanup() {
    console.log('🧹 FORCE CLEANUP: Iniciando limpeza manual...');
    
    await this.rotateLogFiles();
    await this.cleanupOldLogs();
    await this.cleanupDatabaseLogs();
    await this.optimizeTables();
    
    console.log('✅ FORCE CLEANUP: Limpeza manual concluída');
  }

  /**
   * Parar tarefas agendadas
   */
  stop() {
    cron.getTasks().forEach(task => task.stop());
    console.log('⏹️ LOG ROTATION: Tarefas agendadas paradas');
  }
}

// Singleton instance
const logRotationManager = new LogRotationManager();

module.exports = logRotationManager;
