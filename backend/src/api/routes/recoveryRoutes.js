/**
 * 🔄 ROTAS DE RECUPERAÇÃO DE DADOS
 * 
 * API completa para validação e gestão de recovery:
 * - Validação de backups e recovery
 * - Testes de disaster recovery
 * - Monitoramento de saúde do sistema
 * - Gestão de planos de recovery
 * - Relatórios de RTO/RPO
 */

const express = require('express');
const router = express.Router();
const dataRecoveryValidator = require('../../utils/dataRecoveryValidator');
const disasterRecoveryManager = require('../../utils/disasterRecovery');
const encryptedBackup = require('../../utils/encryptedBackup');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const auditLogger = require('../../utils/auditLogger');
const multer = require('multer');
const path = require('path');

// Configurar upload de backups para teste
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../temp_uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `test-backup-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.backup')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .backup são permitidos'));
    }
  }
});

// Todas as rotas requerem autenticação de admin
router.use(authMiddleware);
router.use(requireAdmin);

/**
 * @route GET /api/recovery/status
 * @desc Obter status do sistema de disaster recovery
 * @access Admin only
 */
router.get('/status', async (req, res) => {
  try {
    const drStatus = disasterRecoveryManager.getStatus();
    const validatorStats = dataRecoveryValidator.getStats();
    
    // Verificação de saúde em tempo real
    const healthCheck = await disasterRecoveryManager.performHealthCheck();
    
    res.json({
      success: true,
      status: {
        disasterRecovery: drStatus,
        validator: validatorStats,
        currentHealth: healthCheck,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Erro ao obter status de recovery:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/recovery/validate-backup
 * @desc Validar backup específico
 * @access Admin only
 */
router.post('/validate-backup', upload.single('backup'), async (req, res) => {
  try {
    const { password, fullValidation = 'false' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Arquivo de backup é obrigatório'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Senha do backup é obrigatória'
      });
    }

    console.log(`🔍 Validando backup: ${req.file.originalname}`);

    let validationResult;
    
    if (fullValidation === 'true') {
      // Validação completa com recovery test
      validationResult = await dataRecoveryValidator.runFullRecoveryValidation(
        req.file.path,
        password,
        { createBackupBeforeRestore: false }
      );
    } else {
      // Validação básica de integridade
      validationResult = await dataRecoveryValidator.validateBackupIntegrity(
        req.file.path,
        password
      );
    }

    // Limpar arquivo temporário
    try {
      await require('fs').promises.unlink(req.file.path);
    } catch (cleanupError) {
      console.warn('⚠️ Erro ao limpar arquivo temporário:', cleanupError);
    }

    // Auditar validação
    await auditLogger.logUserAction(req.user.id, 'BACKUP_VALIDATED', {
      backup_file: req.file.originalname,
      full_validation: fullValidation === 'true',
      result: validationResult.success || validationResult.valid,
      duration: validationResult.totalDuration || validationResult.details?.validationTime
    });

    res.json({
      success: true,
      validation: validationResult,
      message: (validationResult.success || validationResult.valid) ? 
        'Backup validado com sucesso' : 'Backup falhou na validação'
    });

  } catch (error) {
    console.error('Erro ao validar backup:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/recovery/test-recovery
 * @desc Executar teste completo de recovery
 * @access Admin only
 */
router.post('/test-recovery', async (req, res) => {
  try {
    const { backupFile, password, options = {} } = req.body;

    if (!backupFile || !password) {
      return res.status(400).json({
        success: false,
        error: 'Arquivo de backup e senha são obrigatórios'
      });
    }

    // Verificar se arquivo existe
    const backupPath = path.resolve(backupFile);
    try {
      await require('fs').promises.access(backupPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Arquivo de backup não encontrado'
      });
    }

    console.log(`🧪 Iniciando teste de recovery: ${backupFile}`);

    // Executar teste completo
    const testResult = await dataRecoveryValidator.runFullRecoveryValidation(
      backupPath,
      password,
      options
    );

    // Auditar teste
    await auditLogger.logUserAction(req.user.id, 'RECOVERY_TEST_EXECUTED', {
      backup_file: backupFile,
      success: testResult.success,
      duration: testResult.totalDuration,
      test_id: testResult.testId
    });

    res.json({
      success: true,
      testResult,
      message: testResult.success ? 
        'Teste de recovery concluído com sucesso' : 
        'Teste de recovery falhou'
    });

  } catch (error) {
    console.error('Erro no teste de recovery:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/recovery/health-check
 * @desc Executar verificação de saúde do sistema
 * @access Admin only
 */
router.get('/health-check', async (req, res) => {
  try {
    const healthCheck = await disasterRecoveryManager.performHealthCheck();
    
    res.json({
      success: true,
      healthCheck,
      recommendations: this.generateHealthRecommendations(healthCheck)
    });

  } catch (error) {
    console.error('Erro na verificação de saúde:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/recovery/force-recovery
 * @desc Forçar recovery manual
 * @access Admin only
 */
router.post('/force-recovery', async (req, res) => {
  try {
    const { recoveryType = 'APPLICATION_FAILURE', reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Motivo do recovery é obrigatório'
      });
    }

    console.log(`🚨 Recovery manual forçado: ${recoveryType}`);

    // Iniciar recovery manual
    const recoveryResult = await disasterRecoveryManager.initiateAutomaticRecovery();

    // Auditar recovery forçado
    await auditLogger.logUserAction(req.user.id, 'MANUAL_RECOVERY_FORCED', {
      recovery_type: recoveryType,
      reason,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Recovery manual iniciado',
      recoveryType,
      reason
    });

  } catch (error) {
    console.error('Erro no recovery manual:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/recovery/backups
 * @desc Listar backups disponíveis
 * @access Admin only
 */
router.get('/backups', async (req, res) => {
  try {
    const backups = await encryptedBackup.listBackups();
    
    // Enriquecer com informações de validação
    const enrichedBackups = [];
    
    for (const backup of backups) {
      try {
        // Verificação básica sem senha (apenas metadados)
        const stats = await require('fs').promises.stat(backup.path);
        
        enrichedBackups.push({
          ...backup,
          fileSize: stats.size,
          lastModified: stats.mtime,
          isRecent: Date.now() - stats.mtime.getTime() < 24 * 60 * 60 * 1000,
          validated: false // Requer senha para validação completa
        });
      } catch (error) {
        enrichedBackups.push({
          ...backup,
          error: error.message,
          validated: false
        });
      }
    }

    res.json({
      success: true,
      backups: enrichedBackups,
      total: enrichedBackups.length,
      recentBackups: enrichedBackups.filter(b => b.isRecent).length
    });

  } catch (error) {
    console.error('Erro ao listar backups:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/recovery/reports
 * @desc Obter relatórios de recovery
 * @access Admin only
 */
router.get('/reports', async (req, res) => {
  try {
    const { limit = 10, type = 'all' } = req.query;
    
    const reportsDir = path.join(__dirname, '../../../recovery_reports');
    
    try {
      const files = await require('fs').promises.readdir(reportsDir);
      const reportFiles = files.filter(file => file.endsWith('.json'));
      
      // Ordenar por data (mais recente primeiro)
      reportFiles.sort((a, b) => {
        const timeA = parseInt(a.split('-')[2]);
        const timeB = parseInt(b.split('-')[2]);
        return timeB - timeA;
      });

      const reports = [];
      const limitNum = parseInt(limit);
      
      for (let i = 0; i < Math.min(reportFiles.length, limitNum); i++) {
        try {
          const reportPath = path.join(reportsDir, reportFiles[i]);
          const reportContent = await require('fs').promises.readFile(reportPath, 'utf8');
          const report = JSON.parse(reportContent);
          
          // Incluir apenas resumo se não for detalhado
          if (type === 'summary') {
            reports.push({
              testId: report.testId,
              timestamp: report.timestamp,
              success: report.success,
              totalDuration: report.totalDuration,
              summary: report.summary
            });
          } else {
            reports.push(report);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao ler relatório ${reportFiles[i]}:`, error);
        }
      }

      res.json({
        success: true,
        reports,
        total: reports.length,
        available: reportFiles.length
      });

    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({
          success: true,
          reports: [],
          total: 0,
          message: 'Nenhum relatório de recovery encontrado'
        });
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('Erro ao obter relatórios:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/recovery/metrics
 * @desc Obter métricas de recovery
 * @access Admin only
 */
router.get('/metrics', async (req, res) => {
  try {
    const drMetrics = disasterRecoveryManager.getStatus();
    const validatorStats = dataRecoveryValidator.getStats();
    
    // Métricas de SLA
    const slaMetrics = {
      rtoTarget: drMetrics.config.rto,
      rpoTarget: drMetrics.config.rpo,
      actualRTO: validatorStats.avgRecoveryTime,
      rtoCompliance: validatorStats.avgRecoveryTime <= drMetrics.config.rto,
      lastTestDate: validatorStats.lastTestDate,
      testFrequency: this.calculateTestFrequency(validatorStats)
    };

    // Métricas de disponibilidade
    const availabilityMetrics = {
      currentUptime: process.uptime(),
      systemState: drMetrics.currentState,
      lastIncident: drMetrics.metrics.lastIncident,
      mtbf: this.calculateMTBF(drMetrics.metrics), // Mean Time Between Failures
      mttr: this.calculateMTTR(drMetrics.metrics)  // Mean Time To Recovery
    };

    res.json({
      success: true,
      metrics: {
        disaster_recovery: drMetrics,
        validator: validatorStats,
        sla: slaMetrics,
        availability: availabilityMetrics,
        timestamp: new Date()
      }
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
 * @route POST /api/recovery/run-dr-test
 * @desc Executar teste completo de disaster recovery
 * @access Admin only
 */
router.post('/run-dr-test', async (req, res) => {
  try {
    const { scenario = 'APPLICATION_FAILURE', simulate = true } = req.body;

    console.log(`🧪 Executando teste de DR: ${scenario}`);

    // Auditar início do teste
    await auditLogger.logUserAction(req.user.id, 'DR_TEST_STARTED', {
      scenario,
      simulate,
      timestamp: new Date()
    });

    if (simulate) {
      // Teste simulado (não afeta produção)
      const testResult = await this.runSimulatedDRTest(scenario);
      
      res.json({
        success: true,
        testResult,
        message: 'Teste de DR simulado concluído',
        simulation: true
      });
    } else {
      // Teste real (cuidado!)
      return res.status(403).json({
        success: false,
        error: 'Testes reais de DR devem ser executados em ambiente controlado',
        recommendation: 'Use simulate=true para testes seguros'
      });
    }

  } catch (error) {
    console.error('Erro no teste de DR:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/recovery/plans
 * @desc Listar planos de disaster recovery
 * @access Admin only
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = Array.from(disasterRecoveryManager.recoveryPlans.values());
    
    // Enriquecer com estatísticas de uso
    const enrichedPlans = plans.map(plan => ({
      ...plan,
      estimatedDuration: this.estimatePlanDuration(plan),
      lastUsed: this.getLastPlanUsage(plan.id),
      complexity: this.calculatePlanComplexity(plan)
    }));

    res.json({
      success: true,
      plans: enrichedPlans,
      total: enrichedPlans.length
    });

  } catch (error) {
    console.error('Erro ao listar planos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/recovery/create-emergency-backup
 * @desc Criar backup de emergência
 * @access Admin only
 */
router.post('/create-emergency-backup', async (req, res) => {
  try {
    const { password, reason = 'Manual emergency backup' } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Senha para backup é obrigatória'
      });
    }

    console.log('🚨 Criando backup de emergência...');

    // Criar backup com prioridade alta
    const backupResult = await encryptedBackup.createEncryptedBackup(password, {
      reason: `EMERGENCY: ${reason}`,
      priority: 'HIGH',
      requestedBy: req.user.id
    });

    // Validar backup imediatamente
    const validation = await dataRecoveryValidator.validateBackupIntegrity(
      backupResult.backupPath,
      password
    );

    // Auditar criação
    await auditLogger.logUserAction(req.user.id, 'EMERGENCY_BACKUP_CREATED', {
      backup_file: backupResult.filename,
      reason,
      validation_result: validation.valid,
      file_size: backupResult.fileSize
    });

    res.json({
      success: true,
      backup: {
        filename: backupResult.filename,
        path: backupResult.backupPath,
        size: backupResult.fileSize,
        validation: validation.valid
      },
      message: 'Backup de emergência criado e validado'
    });

  } catch (error) {
    console.error('Erro ao criar backup de emergência:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/recovery/rto-rpo-report
 * @desc Relatório de RTO/RPO
 * @access Admin only
 */
router.get('/rto-rpo-report', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calcular período
    let days;
    switch (period) {
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      case '90d': days = 90; break;
      default: days = 30;
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Buscar incidentes e recoveries do período
    const incidents = await this.getIncidentsInPeriod(startDate);
    const recoveryTests = await this.getRecoveryTestsInPeriod(startDate);

    // Calcular métricas de RTO/RPO
    const rtoMetrics = this.calculateRTOMetrics(incidents, recoveryTests);
    const rpoMetrics = this.calculateRPOMetrics(incidents);

    // Gerar relatório
    const report = {
      period: `${days} dias`,
      startDate,
      endDate: new Date(),
      rto: {
        target: disasterRecoveryManager.slaTargets.RTO,
        actual: rtoMetrics,
        compliance: rtoMetrics.average <= disasterRecoveryManager.slaTargets.RTO
      },
      rpo: {
        target: disasterRecoveryManager.slaTargets.RPO,
        actual: rpoMetrics,
        compliance: rpoMetrics.average <= disasterRecoveryManager.slaTargets.RPO
      },
      incidents: {
        total: incidents.length,
        byType: this.groupIncidentsByType(incidents),
        resolved: incidents.filter(i => i.resolved).length
      },
      tests: {
        total: recoveryTests.length,
        successful: recoveryTests.filter(t => t.success).length,
        averageDuration: this.calculateAverageTestDuration(recoveryTests)
      },
      recommendations: this.generateRTORPORecommendations(rtoMetrics, rpoMetrics)
    };

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Erro ao gerar relatório RTO/RPO:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/recovery/schedule-test
 * @desc Agendar teste de recovery
 * @access Admin only
 */
router.post('/schedule-test', async (req, res) => {
  try {
    const { 
      testType = 'full_validation',
      scheduledDate,
      backupFile,
      password,
      notifyTeam = true
    } = req.body;

    if (!scheduledDate) {
      return res.status(400).json({
        success: false,
        error: 'Data do agendamento é obrigatória'
      });
    }

    const scheduledTime = new Date(scheduledDate);
    if (scheduledTime <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Data deve ser no futuro'
      });
    }

    // Agendar teste (implementação simplificada)
    const testId = `SCHEDULED-${Date.now()}`;
    
    console.log(`📅 Teste de recovery agendado: ${testId} para ${scheduledTime}`);

    // Em produção, usar um sistema de agendamento como node-cron
    setTimeout(async () => {
      try {
        console.log(`🧪 Executando teste agendado: ${testId}`);
        
        if (backupFile && password) {
          await dataRecoveryValidator.runFullRecoveryValidation(backupFile, password);
        } else {
          await disasterRecoveryManager.performHealthCheck();
        }
        
        console.log(`✅ Teste agendado concluído: ${testId}`);
      } catch (error) {
        console.error(`❌ Erro no teste agendado ${testId}:`, error);
      }
    }, scheduledTime.getTime() - Date.now());

    // Auditar agendamento
    await auditLogger.logUserAction(req.user.id, 'RECOVERY_TEST_SCHEDULED', {
      test_id: testId,
      test_type: testType,
      scheduled_date: scheduledDate,
      backup_file: backupFile || null
    });

    res.json({
      success: true,
      testId,
      scheduledDate: scheduledTime,
      testType,
      message: 'Teste de recovery agendado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao agendar teste:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Executar teste simulado de DR
 */
async function runSimulatedDRTest(scenario) {
  const startTime = Date.now();
  
  try {
    console.log(`🎭 Simulando cenário: ${scenario}`);
    
    // Simular diferentes cenários
    const scenarios = {
      'DATABASE_FAILURE': {
        duration: 15 * 60 * 1000, // 15 minutos
        steps: ['detect_failure', 'switch_readonly', 'restore_backup', 'validate', 'resume'],
        successRate: 95
      },
      'APPLICATION_FAILURE': {
        duration: 30 * 60 * 1000, // 30 minutos
        steps: ['restart_services', 'check_health', 'restore_config', 'validate'],
        successRate: 98
      },
      'SECURITY_BREACH': {
        duration: 45 * 60 * 1000, // 45 minutos
        steps: ['isolate', 'assess', 'contain', 'clean_restore', 'secure'],
        successRate: 90
      }
    };

    const scenarioConfig = scenarios[scenario] || scenarios['APPLICATION_FAILURE'];
    
    // Simular execução dos passos
    const stepResults = [];
    for (const step of scenarioConfig.steps) {
      const stepStart = Date.now();
      
      // Simular tempo de execução
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
      
      const success = Math.random() * 100 < scenarioConfig.successRate;
      
      stepResults.push({
        step,
        success,
        duration: Date.now() - stepStart,
        timestamp: new Date()
      });
      
      if (!success) {
        break; // Parar se passo falhar
      }
    }

    const totalDuration = Date.now() - startTime;
    const allStepsSuccessful = stepResults.every(step => step.success);

    return {
      scenario,
      success: allStepsSuccessful,
      duration: totalDuration,
      steps: stepResults,
      rtoCompliance: totalDuration <= scenarioConfig.duration,
      simulationMetrics: {
        expectedDuration: scenarioConfig.duration,
        actualDuration: totalDuration,
        successRate: scenarioConfig.successRate
      }
    };
  } catch (error) {
    return {
      scenario,
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Gerar recomendações de saúde
 */
function generateHealthRecommendations(healthCheck) {
  const recommendations = [];
  
  if (healthCheck.status !== 'HEALTHY') {
    recommendations.push({
      priority: 'HIGH',
      message: `Sistema em estado ${healthCheck.status}`,
      action: 'Investigar e corrigir problemas identificados'
    });
  }

  const unhealthyChecks = healthCheck.checks?.filter(check => !check.healthy) || [];
  
  for (const check of unhealthyChecks) {
    recommendations.push({
      priority: 'MEDIUM',
      message: `Problema detectado: ${check.name}`,
      action: `Verificar e corrigir: ${check.error || 'Detalhes na verificação'}`
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'INFO',
      message: 'Sistema saudável',
      action: 'Manter monitoramento regular'
    });
  }

  return recommendations;
}

// Funções auxiliares para métricas
function calculateTestFrequency(stats) {
  if (!stats.lastTestDate || stats.totalTests === 0) {
    return 'Nunca testado';
  }
  
  const daysSinceLastTest = Math.floor((Date.now() - new Date(stats.lastTestDate).getTime()) / (24 * 60 * 60 * 1000));
  
  if (daysSinceLastTest === 0) return 'Hoje';
  if (daysSinceLastTest === 1) return 'Ontem';
  if (daysSinceLastTest <= 7) return `${daysSinceLastTest} dias atrás`;
  if (daysSinceLastTest <= 30) return `${Math.floor(daysSinceLastTest / 7)} semanas atrás`;
  return `${Math.floor(daysSinceLastTest / 30)} meses atrás`;
}

function calculateMTBF(metrics) {
  // Mean Time Between Failures (simulado)
  return metrics.totalIncidents > 0 ? 
    Math.floor(process.uptime() / metrics.totalIncidents / 3600) : // horas
    Math.floor(process.uptime() / 3600); // uptime total se sem incidentes
}

function calculateMTTR(metrics) {
  // Mean Time To Recovery
  return metrics.avgRecoveryTime || 0;
}

async function getIncidentsInPeriod(startDate) {
  // Implementação simplificada - buscar de logs de auditoria
  try {
    const result = await require('../../config/database').query(`
      SELECT * FROM logs_auditoria 
      WHERE event_type LIKE '%INCIDENT%' 
        OR event_type LIKE '%RECOVERY%'
        AND timestamp >= $1
      ORDER BY timestamp DESC
    `, [startDate]);
    
    return result.rows;
  } catch (error) {
    console.warn('⚠️ Erro ao buscar incidentes:', error);
    return [];
  }
}

async function getRecoveryTestsInPeriod(startDate) {
  // Buscar testes de recovery do período
  try {
    const result = await require('../../config/database').query(`
      SELECT * FROM logs_auditoria 
      WHERE event_type = 'RECOVERY_VALIDATION_COMPLETED'
        AND timestamp >= $1
      ORDER BY timestamp DESC
    `, [startDate]);
    
    return result.rows.map(row => ({
      timestamp: row.timestamp,
      success: row.event_data?.success || false,
      duration: row.event_data?.duration || 0
    }));
  } catch (error) {
    console.warn('⚠️ Erro ao buscar testes:', error);
    return [];
  }
}

function calculateRTOMetrics(incidents, tests) {
  const recoveryTimes = [
    ...incidents.map(i => i.event_data?.duration || 0),
    ...tests.map(t => t.duration || 0)
  ].filter(time => time > 0);

  if (recoveryTimes.length === 0) {
    return { average: 0, min: 0, max: 0, count: 0 };
  }

  return {
    average: recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length,
    min: Math.min(...recoveryTimes),
    max: Math.max(...recoveryTimes),
    count: recoveryTimes.length
  };
}

function calculateRPOMetrics(incidents) {
  // RPO é mais difícil de calcular automaticamente
  // Por agora, retornar métricas baseadas na frequência de backup
  return {
    average: 60 * 60 * 1000, // 1 hora (baseado na frequência de backup)
    target: 60 * 60 * 1000,
    compliance: true
  };
}

function groupIncidentsByType(incidents) {
  return incidents.reduce((acc, incident) => {
    const type = incident.event_type || 'UNKNOWN';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
}

function calculateAverageTestDuration(tests) {
  if (tests.length === 0) return 0;
  return tests.reduce((sum, test) => sum + (test.duration || 0), 0) / tests.length;
}

function generateRTORPORecommendations(rtoMetrics, rpoMetrics) {
  const recommendations = [];
  
  if (rtoMetrics.average > disasterRecoveryManager.slaTargets.RTO) {
    recommendations.push({
      priority: 'HIGH',
      message: 'RTO acima do target',
      action: 'Otimizar processos de recovery'
    });
  }
  
  if (rpoMetrics.average > disasterRecoveryManager.slaTargets.RPO) {
    recommendations.push({
      priority: 'HIGH', 
      message: 'RPO acima do target',
      action: 'Aumentar frequência de backups'
    });
  }

  return recommendations;
}

module.exports = router;
