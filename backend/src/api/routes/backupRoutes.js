const express = require('express');
const router = express.Router();
const encryptedBackupManager = require('../../utils/encryptedBackup');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const auditLogger = require('../../utils/auditLogger');

/**
 * 🔒 ROTAS DE BACKUP CRIPTOGRAFADO
 * 
 * Endpoints para gerenciamento de backups seguros
 */

/**
 * POST /api/backup/create
 * Criar backup criptografado completo
 */
router.post('/create', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { password, options = {} } = req.body;
    
    // Validar senha
    if (!password || password.length < 12) {
      return res.status(400).json({
        success: false,
        error: 'Senha deve ter pelo menos 12 caracteres'
      });
    }
    
    // Log de auditoria inicial
    await auditLogger.security('BACKUP_CREATE_STARTED', {
      userId: req.user.id,
      options: Object.keys(options)
    });
    
    // Criar backup
    const result = await encryptedBackupManager.createFullBackup(password, options);
    
    res.status(200).json({
      success: true,
      message: 'Backup criado com sucesso',
      backup: {
        id: result.backupId,
        file: result.file.split('/').pop(), // Apenas nome do arquivo
        metadata: {
          timestamp: result.metadata.timestamp,
          recordCount: result.metadata.recordCount,
          size: result.metadata.encryptedSize,
          duration: result.metadata.duration,
          tables: result.metadata.tables
        }
      }
    });
    
  } catch (error) {
    console.error('❌ BACKUP API: Erro ao criar backup:', error);
    
    await auditLogger.security('BACKUP_CREATE_FAILED', {
      userId: req.user?.id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Erro ao criar backup',
      details: error.message
    });
  }
});

/**
 * POST /api/backup/validate
 * Validar integridade de backup
 */
router.post('/validate', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { filename, password } = req.body;
    
    if (!filename || !password) {
      return res.status(400).json({
        success: false,
        error: 'Nome do arquivo e senha são obrigatórios'
      });
    }
    
    const backupPath = require('path').join(
      encryptedBackupManager.backupDir,
      filename
    );
    
    // Log de auditoria
    await auditLogger.security('BACKUP_VALIDATION_STARTED', {
      userId: req.user.id,
      filename
    });
    
    // Validar backup
    const validation = await encryptedBackupManager.validateBackup(backupPath, password);
    
    if (validation.valid) {
      await auditLogger.security('BACKUP_VALIDATION_SUCCESS', {
        userId: req.user.id,
        filename,
        recordCount: validation.dataPreview.recordCount
      });
    }
    
    res.status(200).json({
      success: true,
      validation
    });
    
  } catch (error) {
    console.error('❌ BACKUP API: Erro na validação:', error);
    
    await auditLogger.security('BACKUP_VALIDATION_FAILED', {
      userId: req.user?.id,
      filename: req.body.filename,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Erro na validação do backup',
      details: error.message
    });
  }
});

/**
 * POST /api/backup/restore
 * Restaurar backup criptografado
 */
router.post('/restore', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { filename, password, options = {} } = req.body;
    
    if (!filename || !password) {
      return res.status(400).json({
        success: false,
        error: 'Nome do arquivo e senha são obrigatórios'
      });
    }
    
    // Confirmar operação crítica
    if (!req.body.confirmRestore) {
      return res.status(400).json({
        success: false,
        error: 'Confirmação de restore obrigatória (confirmRestore: true)'
      });
    }
    
    const backupPath = require('path').join(
      encryptedBackupManager.backupDir,
      filename
    );
    
    // Log de auditoria crítica
    await auditLogger.security('BACKUP_RESTORE_STARTED', {
      userId: req.user.id,
      filename,
      options: Object.keys(options),
      critical: true
    });
    
    // Restaurar backup
    const result = await encryptedBackupManager.restoreBackup(backupPath, password, options);
    
    res.status(200).json({
      success: true,
      message: 'Backup restaurado com sucesso',
      result: {
        restoredTables: result.restoredTables,
        restoredRecords: result.restoredRecords,
        duration: result.duration
      }
    });
    
  } catch (error) {
    console.error('❌ BACKUP API: Erro no restore:', error);
    
    await auditLogger.security('BACKUP_RESTORE_FAILED', {
      userId: req.user?.id,
      filename: req.body.filename,
      error: error.message,
      critical: true
    });
    
    res.status(500).json({
      success: false,
      error: 'Erro ao restaurar backup',
      details: error.message
    });
  }
});

/**
 * GET /api/backup/list
 * Listar backups disponíveis
 */
router.get('/list', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const backups = await encryptedBackupManager.listBackups();
    
    // Remover informações sensíveis
    const safeBackups = backups.map(backup => ({
      file: backup.file,
      size: backup.size,
      created: backup.created,
      modified: backup.modified,
      valid: backup.valid,
      error: backup.error,
      metadata: backup.metadata ? {
        timestamp: backup.metadata.timestamp,
        recordCount: backup.metadata.recordCount,
        tables: backup.metadata.tables,
        originalSize: backup.metadata.originalSize,
        compressedSize: backup.metadata.compressedSize,
        encryptedSize: backup.metadata.encryptedSize
      } : null
    }));
    
    res.status(200).json({
      success: true,
      backups: safeBackups
    });
    
  } catch (error) {
    console.error('❌ BACKUP API: Erro ao listar backups:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao listar backups',
      details: error.message
    });
  }
});

/**
 * DELETE /api/backup/cleanup
 * Limpar backups antigos
 */
router.delete('/cleanup', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await auditLogger.security('BACKUP_CLEANUP_STARTED', {
      userId: req.user.id
    });
    
    const cleaned = await encryptedBackupManager.cleanupOldBackups();
    
    res.status(200).json({
      success: true,
      message: `${cleaned} backups antigos removidos`,
      cleaned
    });
    
  } catch (error) {
    console.error('❌ BACKUP API: Erro na limpeza:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro na limpeza de backups',
      details: error.message
    });
  }
});

/**
 * DELETE /api/backup/:filename
 * Deletar backup específico
 */
router.delete('/:filename', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename.endsWith('.pdb')) {
      return res.status(400).json({
        success: false,
        error: 'Nome de arquivo inválido'
      });
    }
    
    const backupPath = require('path').join(
      encryptedBackupManager.backupDir,
      filename
    );
    
    // Verificar se arquivo existe
    const fs = require('fs').promises;
    try {
      await fs.access(backupPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Backup não encontrado'
      });
    }
    
    // Log de auditoria
    await auditLogger.security('BACKUP_DELETE_STARTED', {
      userId: req.user.id,
      filename
    });
    
    // Deletar arquivo
    await fs.unlink(backupPath);
    
    await auditLogger.security('BACKUP_DELETED', {
      userId: req.user.id,
      filename
    });
    
    res.status(200).json({
      success: true,
      message: 'Backup deletado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ BACKUP API: Erro ao deletar backup:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar backup',
      details: error.message
    });
  }
});

/**
 * GET /api/backup/status
 * Status do sistema de backup
 */
router.get('/status', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const backups = await encryptedBackupManager.listBackups();
    const validBackups = backups.filter(b => b.valid);
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    
    const status = {
      totalBackups: backups.length,
      validBackups: validBackups.length,
      invalidBackups: backups.length - validBackups.length,
      totalSize,
      latestBackup: validBackups.length > 0 ? validBackups[0] : null,
      oldestBackup: validBackups.length > 0 ? validBackups[validBackups.length - 1] : null,
      directories: {
        backupDir: encryptedBackupManager.backupDir,
        tempDir: encryptedBackupManager.tempDir
      },
      configuration: {
        algorithm: encryptedBackupManager.algorithm,
        compressionLevel: encryptedBackupManager.compressionLevel,
        maxBackupAge: encryptedBackupManager.maxBackupAge,
        maxBackupSize: encryptedBackupManager.maxBackupSize
      }
    };
    
    res.status(200).json({
      success: true,
      status
    });
    
  } catch (error) {
    console.error('❌ BACKUP API: Erro ao obter status:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao obter status do backup',
      details: error.message
    });
  }
});

/**
 * POST /api/backup/schedule
 * Agendar backup automático
 */
router.post('/schedule', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { password, schedule, options = {} } = req.body;
    
    if (!password || !schedule) {
      return res.status(400).json({
        success: false,
        error: 'Senha e agendamento são obrigatórios'
      });
    }
    
    // Validar formato cron
    const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
    
    if (!cronRegex.test(schedule)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de agendamento inválido (use formato cron)'
      });
    }
    
    // Salvar configuração de agendamento
    const db = require('../../config/database');
    await db.query(`
      INSERT INTO configuracoes (chave, valor, tipo, descricao)
      VALUES ('backup_schedule', $1, 'json', 'Configuração de backup automático')
      ON CONFLICT (chave)
      DO UPDATE SET 
        valor = EXCLUDED.valor,
        atualizado_em = CURRENT_TIMESTAMP
    `, [JSON.stringify({
      schedule,
      password: '[ENCRYPTED]', // Não salvar senha em texto plano
      options,
      enabled: true,
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    })]);
    
    await auditLogger.security('BACKUP_SCHEDULE_CONFIGURED', {
      userId: req.user.id,
      schedule,
      options: Object.keys(options)
    });
    
    res.status(200).json({
      success: true,
      message: 'Backup automático agendado com sucesso',
      schedule
    });
    
  } catch (error) {
    console.error('❌ BACKUP API: Erro ao agendar backup:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao agendar backup',
      details: error.message
    });
  }
});

module.exports = router;
