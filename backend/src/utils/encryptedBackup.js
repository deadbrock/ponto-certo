const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const db = require('../config/database');
const auditLogger = require('./auditLogger');
const { maskCPF, mask } = require('./dataMasking');

/**
 * 🔒 SISTEMA DE BACKUP CRIPTOGRAFADO
 * 
 * Sistema completo de backup com criptografia AES-256-GCM,
 * compressão, integridade, validação e restore seguro
 */

class EncryptedBackupManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    
    // Diretórios de backup
    this.backupDir = path.join(__dirname, '../../backups');
    this.tempDir = path.join(__dirname, '../../temp_backups');
    
    // Configurações
    this.compressionLevel = 6;
    this.maxBackupAge = 90 * 24 * 60 * 60 * 1000; // 90 dias
    this.maxBackupSize = 500 * 1024 * 1024; // 500MB
    
    this.initializeDirectories();
  }

  /**
   * Inicializar diretórios de backup
   */
  async initializeDirectories() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true, mode: 0o700 });
      await fs.mkdir(this.tempDir, { recursive: true, mode: 0o700 });
      console.log('📁 BACKUP: Diretórios inicializados');
    } catch (error) {
      console.error('❌ BACKUP: Erro ao criar diretórios:', error);
    }
  }

  /**
   * Gerar chave de criptografia derivada de senha
   */
  generateEncryptionKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha512');
  }

  /**
   * Criar backup completo criptografado
   */
  async createFullBackup(password, options = {}) {
    const startTime = Date.now();
    const backupId = `backup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    try {
      console.log(`🔒 BACKUP: Iniciando backup completo ${backupId}`);
      
      // Validar senha
      if (!password || password.length < 12) {
        throw new Error('Senha de backup deve ter pelo menos 12 caracteres');
      }
      
      // Gerar salt e chave
      const salt = crypto.randomBytes(this.saltLength);
      const key = this.generateEncryptionKey(password, salt);
      
      // Coletar dados
      const backupData = await this.collectAllData(options);
      
      // Comprimir dados
      const compressedData = await this.compressData(JSON.stringify(backupData));
      
      // Criptografar
      const encryptedData = await this.encryptData(compressedData, key);
      
      // Gerar metadados
      const metadata = {
        backupId,
        timestamp: new Date().toISOString(),
        version: '2.0',
        algorithm: this.algorithm,
        compression: 'gzip',
        tables: Object.keys(backupData.tables),
        recordCount: this.getTotalRecords(backupData),
        originalSize: JSON.stringify(backupData).length,
        compressedSize: compressedData.length,
        encryptedSize: encryptedData.encrypted.length,
        integrity: {
          dataHash: crypto.createHash('sha256').update(JSON.stringify(backupData)).digest('hex'),
          compressedHash: crypto.createHash('sha256').update(compressedData).digest('hex')
        }
      };
      
      // Salvar backup
      const backupFile = await this.saveBackupFile(backupId, {
        metadata,
        salt: salt.toString('hex'),
        iv: encryptedData.iv,
        tag: encryptedData.tag,
        data: encryptedData.encrypted
      });
      
      // Auditoria
      await auditLogger.security('BACKUP_CREATED', {
        backupId,
        file: backupFile,
        recordCount: metadata.recordCount,
        size: metadata.encryptedSize,
        duration: Date.now() - startTime
      });
      
      console.log(`✅ BACKUP: Backup ${backupId} criado com sucesso`);
      console.log(`📊 BACKUP: ${metadata.recordCount} registros, ${this.formatBytes(metadata.encryptedSize)}`);
      
      return {
        success: true,
        backupId,
        file: backupFile,
        metadata: {
          ...metadata,
          duration: Date.now() - startTime
        }
      };
      
    } catch (error) {
      console.error(`❌ BACKUP: Erro ao criar backup ${backupId}:`, error);
      
      await auditLogger.security('BACKUP_FAILED', {
        backupId,
        error: error.message,
        duration: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * Coletar todos os dados para backup
   */
  async collectAllData(options = {}) {
    console.log('📊 BACKUP: Coletando dados...');
    
    const tables = {
      usuarios: await this.getTableData('usuarios', this.sanitizeUsuarios),
      colaboradores: await this.getTableData('colaboradores', this.sanitizeColaboradores),
      registros_ponto: await this.getTableData('registros_ponto'),
      configuracoes: await this.getTableData('configuracoes'),
      audit_sessions: await this.getTableData('audit_sessions', this.sanitizeAuditSessions),
      logs_auditoria: await this.getTableData('logs_auditoria', this.sanitizeLogs)
    };
    
    // Incluir dados específicos se solicitado
    if (options.includeBiometric) {
      tables.biometric_data = await this.getTableData('biometric_data', this.sanitizeBiometric);
    }
    
    if (options.includeFiles) {
      tables.file_metadata = await this.collectFileMetadata();
    }
    
    return {
      timestamp: new Date().toISOString(),
      version: '2.0',
      source: 'ponto-digital-backend',
      tables,
      statistics: this.generateStatistics(tables)
    };
  }

  /**
   * Obter dados de uma tabela
   */
  async getTableData(tableName, sanitizer = null) {
    try {
      const result = await db.query(`SELECT * FROM ${tableName} ORDER BY id`);
      let data = result.rows;
      
      if (sanitizer) {
        data = data.map(sanitizer);
      }
      
      console.log(`📋 BACKUP: ${tableName} - ${data.length} registros`);
      return data;
      
    } catch (error) {
      console.warn(`⚠️ BACKUP: Erro ao coletar ${tableName}:`, error.message);
      return [];
    }
  }

  /**
   * Sanitizar dados de usuários
   */
  sanitizeUsuarios(user) {
    return {
      ...user,
      email: mask(user.email),
      senha_hash: '[REDACTED]',
      backup_sanitized: true
    };
  }

  /**
   * Sanitizar dados de colaboradores
   */
  sanitizeColaboradores(colaborador) {
    return {
      ...colaborador,
      cpf: maskCPF(colaborador.cpf),
      email: colaborador.email ? mask(colaborador.email) : null,
      telefone: colaborador.telefone ? mask(colaborador.telefone) : null,
      backup_sanitized: true
    };
  }

  /**
   * Sanitizar sessões de auditoria
   */
  sanitizeAuditSessions(session) {
    return {
      ...session,
      login_ip: mask(session.login_ip),
      login_user_agent: session.login_user_agent ? '[REDACTED]' : null,
      backup_sanitized: true
    };
  }

  /**
   * Sanitizar logs de auditoria
   */
  sanitizeLogs(log) {
    return {
      ...log,
      ip_address: mask(log.ip_address),
      user_agent: log.user_agent ? '[REDACTED]' : null,
      details: log.details ? '[REDACTED]' : null,
      backup_sanitized: true
    };
  }

  /**
   * Sanitizar dados biométricos
   */
  sanitizeBiometric(biometric) {
    return {
      id: biometric.id,
      colaborador_id: biometric.colaborador_id,
      algorithm: biometric.algorithm,
      created_at: biometric.created_at,
      encrypted: true,
      data: '[ENCRYPTED_BIOMETRIC_DATA]',
      backup_sanitized: true
    };
  }

  /**
   * Comprimir dados
   */
  async compressData(data) {
    const gzip = promisify(zlib.gzip);
    return await gzip(Buffer.from(data), { level: this.compressionLevel });
  }

  /**
   * Descomprimir dados
   */
  async decompressData(compressedData) {
    const gunzip = promisify(zlib.gunzip);
    const decompressed = await gunzip(compressedData);
    return decompressed.toString();
  }

  /**
   * Criptografar dados
   */
  async encryptData(data, key) {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('ponto-digital-backup'));
    
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Descriptografar dados
   */
  async decryptData(encryptedData, key, iv, tag) {
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAAD(Buffer.from('ponto-digital-backup'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  }

  /**
   * Salvar arquivo de backup
   */
  async saveBackupFile(backupId, backupData) {
    const filename = `${backupId}.pdb`; // Ponto Digital Backup
    const filepath = path.join(this.backupDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(backupData, null, 2), { mode: 0o600 });
    
    return filepath;
  }

  /**
   * Validar backup
   */
  async validateBackup(backupFile, password) {
    try {
      console.log(`🔍 BACKUP: Validando ${backupFile}`);
      
      // Ler arquivo
      const backupContent = JSON.parse(await fs.readFile(backupFile, 'utf8'));
      
      // Validar estrutura
      if (!backupContent.metadata || !backupContent.salt || !backupContent.data) {
        throw new Error('Estrutura de backup inválida');
      }
      
      // Gerar chave
      const salt = Buffer.from(backupContent.salt, 'hex');
      const key = this.generateEncryptionKey(password, salt);
      
      // Descriptografar
      const decryptedData = await this.decryptData(
        backupContent.data,
        key,
        backupContent.iv,
        backupContent.tag
      );
      
      // Descomprimir
      const decompressedData = await this.decompressData(decryptedData);
      const originalData = JSON.parse(decompressedData);
      
      // Validar integridade
      const dataHash = crypto.createHash('sha256').update(decompressedData).digest('hex');
      
      if (dataHash !== backupContent.metadata.integrity.dataHash) {
        throw new Error('Integridade dos dados comprometida');
      }
      
      console.log(`✅ BACKUP: Validação bem-sucedida`);
      
      return {
        valid: true,
        metadata: backupContent.metadata,
        dataPreview: {
          tables: Object.keys(originalData.tables),
          recordCount: this.getTotalRecords(originalData),
          timestamp: originalData.timestamp
        }
      };
      
    } catch (error) {
      console.error(`❌ BACKUP: Validação falhou:`, error);
      
      await auditLogger.security('BACKUP_VALIDATION_FAILED', {
        file: backupFile,
        error: error.message
      });
      
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Restaurar backup
   */
  async restoreBackup(backupFile, password, options = {}) {
    const startTime = Date.now();
    let restoredTables = 0;
    let restoredRecords = 0;
    
    try {
      console.log(`🔄 BACKUP: Iniciando restore de ${backupFile}`);
      
      // Validar backup primeiro
      const validation = await this.validateBackup(backupFile, password);
      if (!validation.valid) {
        throw new Error(`Backup inválido: ${validation.error}`);
      }
      
      // Ler e descriptografar
      const backupContent = JSON.parse(await fs.readFile(backupFile, 'utf8'));
      const salt = Buffer.from(backupContent.salt, 'hex');
      const key = this.generateEncryptionKey(password, salt);
      
      const decryptedData = await this.decryptData(
        backupContent.data,
        key,
        backupContent.iv,
        backupContent.tag
      );
      
      const decompressedData = await this.decompressData(decryptedData);
      const originalData = JSON.parse(decompressedData);
      
      // Criar backup atual antes do restore
      if (options.createBackupBeforeRestore !== false) {
        console.log('🔄 BACKUP: Criando backup de segurança antes do restore...');
        await this.createFullBackup(password + '_pre_restore', {
          reason: 'pre_restore_backup'
        });
      }
      
      // Restaurar tabelas
      for (const [tableName, tableData] of Object.entries(originalData.tables)) {
        if (options.tables && !options.tables.includes(tableName)) {
          continue;
        }
        
        try {
          await this.restoreTable(tableName, tableData, options);
          restoredTables++;
          restoredRecords += tableData.length;
          console.log(`✅ BACKUP: ${tableName} restaurada (${tableData.length} registros)`);
        } catch (error) {
          console.error(`❌ BACKUP: Erro ao restaurar ${tableName}:`, error);
          if (!options.continueOnError) {
            throw error;
          }
        }
      }
      
      // Auditoria
      await auditLogger.security('BACKUP_RESTORED', {
        file: backupFile,
        restoredTables,
        restoredRecords,
        duration: Date.now() - startTime
      });
      
      console.log(`✅ BACKUP: Restore concluído - ${restoredTables} tabelas, ${restoredRecords} registros`);
      
      return {
        success: true,
        restoredTables,
        restoredRecords,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      console.error(`❌ BACKUP: Erro no restore:`, error);
      
      await auditLogger.security('BACKUP_RESTORE_FAILED', {
        file: backupFile,
        error: error.message,
        duration: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * Restaurar uma tabela específica
   */
  async restoreTable(tableName, tableData, options = {}) {
    if (tableData.length === 0) {
      return;
    }
    
    // Tabelas críticas que não devem ser restauradas automaticamente
    const criticalTables = ['usuarios', 'audit_sessions'];
    
    if (criticalTables.includes(tableName) && !options.allowCritical) {
      console.warn(`⚠️ BACKUP: Pulando tabela crítica ${tableName} (use allowCritical=true)`);
      return;
    }
    
    // Estratégia de restore
    if (options.strategy === 'replace') {
      // Limpar tabela e inserir dados
      await db.query(`DELETE FROM ${tableName}`);
      console.log(`🗑️ BACKUP: Tabela ${tableName} limpa`);
    }
    
    // Inserir dados em lotes
    const batchSize = 100;
    for (let i = 0; i < tableData.length; i += batchSize) {
      const batch = tableData.slice(i, i + batchSize);
      await this.insertBatch(tableName, batch, options);
    }
  }

  /**
   * Inserir lote de dados
   */
  async insertBatch(tableName, batch, options = {}) {
    if (batch.length === 0) return;
    
    // Remover campos de sanitização
    const cleanBatch = batch.map(record => {
      const { backup_sanitized, ...cleanRecord } = record;
      return cleanRecord;
    });
    
    // Gerar query de inserção
    const columns = Object.keys(cleanBatch[0]);
    const placeholders = cleanBatch.map((_, index) => 
      `(${columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`).join(', ')})`
    ).join(', ');
    
    const values = cleanBatch.flatMap(record => columns.map(col => record[col]));
    
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${placeholders}
      ON CONFLICT (id) DO ${options.strategy === 'replace' ? 'UPDATE SET ' + 
        columns.filter(col => col !== 'id').map(col => `${col} = EXCLUDED.${col}`).join(', ') : 
        'NOTHING'
      }
    `;
    
    await db.query(query, values);
  }

  /**
   * Listar backups disponíveis
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];
      
      for (const file of files) {
        if (!file.endsWith('.pdb')) continue;
        
        const filepath = path.join(this.backupDir, file);
        const stats = await fs.stat(filepath);
        
        try {
          const content = JSON.parse(await fs.readFile(filepath, 'utf8'));
          
          backups.push({
            file,
            path: filepath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            metadata: content.metadata,
            valid: true
          });
        } catch (error) {
          backups.push({
            file,
            path: filepath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            error: error.message,
            valid: false
          });
        }
      }
      
      return backups.sort((a, b) => b.created - a.created);
      
    } catch (error) {
      console.error('❌ BACKUP: Erro ao listar backups:', error);
      return [];
    }
  }

  /**
   * Limpar backups antigos
   */
  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      const now = Date.now();
      let cleaned = 0;
      
      for (const backup of backups) {
        const age = now - backup.created.getTime();
        
        if (age > this.maxBackupAge) {
          await fs.unlink(backup.path);
          console.log(`🗑️ BACKUP: Removido backup antigo ${backup.file}`);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        await auditLogger.security('BACKUP_CLEANUP', {
          cleaned,
          maxAge: this.maxBackupAge
        });
      }
      
      return cleaned;
      
    } catch (error) {
      console.error('❌ BACKUP: Erro na limpeza:', error);
      return 0;
    }
  }

  /**
   * Gerar estatísticas dos dados
   */
  generateStatistics(tables) {
    const stats = {};
    
    for (const [tableName, tableData] of Object.entries(tables)) {
      stats[tableName] = {
        count: tableData.length,
        size: JSON.stringify(tableData).length
      };
    }
    
    return stats;
  }

  /**
   * Obter total de registros
   */
  getTotalRecords(data) {
    return Object.values(data.tables).reduce((total, table) => total + table.length, 0);
  }

  /**
   * Formatar bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Coletar metadados de arquivos
   */
  async collectFileMetadata() {
    try {
      const uploadsDir = path.join(__dirname, '../uploads');
      const files = [];
      
      const scanDirectory = async (dir, relativePath = '') => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.join(relativePath, entry.name);
            
            if (entry.isDirectory()) {
              await scanDirectory(fullPath, relPath);
            } else {
              const stats = await fs.stat(fullPath);
              files.push({
                path: relPath,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                hash: await this.getFileHash(fullPath)
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️ BACKUP: Erro ao escanear ${dir}:`, error.message);
        }
      };
      
      await scanDirectory(uploadsDir);
      return files;
      
    } catch (error) {
      console.warn('⚠️ BACKUP: Erro ao coletar metadados de arquivos:', error);
      return [];
    }
  }

  /**
   * Obter hash de arquivo
   */
  async getFileHash(filepath) {
    try {
      const data = await fs.readFile(filepath);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      return null;
    }
  }
}

// Singleton instance
const encryptedBackupManager = new EncryptedBackupManager();

module.exports = encryptedBackupManager;
