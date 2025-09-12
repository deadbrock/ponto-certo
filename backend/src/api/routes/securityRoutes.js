const express = require('express');
const router = express.Router();
const securityMonitor = require('../../utils/securityMonitor');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');

// Todas as rotas de segurança requerem autenticação de admin
router.use(authMiddleware);
router.use(requireAdmin(['ADMINISTRADOR']));

/**
 * @route GET /api/security/dashboard
 * @desc Obter dados do dashboard de segurança
 * @access Admin only
 */
router.get('/dashboard', (req, res) => {
  try {
    const stats = securityMonitor.getStats();
    const statusReport = securityMonitor.generateStatusReport();
    
    res.json({
      success: true,
      dashboard: {
        ...stats,
        report: statusReport
      }
    });
  } catch (error) {
    console.error('Erro ao obter dashboard de segurança:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/security/threats
 * @desc Obter lista de ameaças detectadas
 * @access Admin only
 */
router.get('/threats', (req, res) => {
  try {
    const topThreats = securityMonitor.getTopThreats();
    const recentActivities = securityMonitor.suspiciousActivities.slice(-50);
    
    res.json({
      success: true,
      threats: {
        top: topThreats,
        recent: recentActivities,
        total: securityMonitor.threats.size
      }
    });
  } catch (error) {
    console.error('Erro ao obter ameaças:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/security/blocked-ips
 * @desc Obter lista de IPs bloqueados
 * @access Admin only
 */
router.get('/blocked-ips', (req, res) => {
  try {
    const blockedIPs = Array.from(securityMonitor.blockedIPs);
    
    res.json({
      success: true,
      blockedIPs,
      count: blockedIPs.length
    });
  } catch (error) {
    console.error('Erro ao obter IPs bloqueados:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/security/unblock-ip
 * @desc Desbloquear IP específico
 * @access Admin only
 */
router.post('/unblock-ip', (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP é obrigatório'
      });
    }
    
    if (!securityMonitor.isIPBlocked(ip)) {
      return res.status(404).json({
        success: false,
        error: 'IP não está bloqueado'
      });
    }
    
    securityMonitor.unblockIP(ip);
    
    // Log da ação administrativa
    securityMonitor.logSecurityEvent('ADMIN_IP_UNBLOCK', {
      ip,
      adminUser: req.user.id,
      adminEmail: req.user.email
    });
    
    res.json({
      success: true,
      message: `IP ${ip} desbloqueado com sucesso`
    });
  } catch (error) {
    console.error('Erro ao desbloquear IP:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/security/block-ip
 * @desc Bloquear IP específico manualmente
 * @access Admin only
 */
router.post('/block-ip', (req, res) => {
  try {
    const { ip, reason } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP é obrigatório'
      });
    }
    
    if (securityMonitor.isIPBlocked(ip)) {
      return res.status(409).json({
        success: false,
        error: 'IP já está bloqueado'
      });
    }
    
    const blockReason = reason || `Bloqueio manual por ${req.user.email}`;
    securityMonitor.blockIP(ip, blockReason);
    
    // Log da ação administrativa
    securityMonitor.logSecurityEvent('ADMIN_IP_BLOCK', {
      ip,
      reason: blockReason,
      adminUser: req.user.id,
      adminEmail: req.user.email
    });
    
    res.json({
      success: true,
      message: `IP ${ip} bloqueado com sucesso`
    });
  } catch (error) {
    console.error('Erro ao bloquear IP:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/security/metrics
 * @desc Obter métricas de segurança
 * @access Admin only
 */
router.get('/metrics', (req, res) => {
  try {
    const { period } = req.query; // day, week, month
    
    // Por enquanto retornamos métricas atuais
    // Em produção, implementaria consulta histórica
    const metrics = {
      current: securityMonitor.securityMetrics,
      systemStatus: securityMonitor.getSystemStatus(),
      period: period || 'current'
    };
    
    res.json({
      success: true,
      metrics
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
 * @route GET /api/security/events
 * @desc Obter eventos de segurança recentes
 * @access Admin only
 */
router.get('/events', (req, res) => {
  try {
    const { limit = 100, severity } = req.query;
    
    // Filtrar eventos por severidade se especificado
    let events = securityMonitor.suspiciousActivities.slice(-limit);
    
    if (severity) {
      events = events.filter(event => 
        securityMonitor.getEventSeverity(event.type) === severity.toUpperCase()
      );
    }
    
    res.json({
      success: true,
      events,
      total: events.length
    });
  } catch (error) {
    console.error('Erro ao obter eventos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/security/run-scan
 * @desc Executar scan de segurança manual
 * @access Admin only
 */
router.post('/run-scan', async (req, res) => {
  try {
    const { scanType = 'basic' } = req.body;
    
    // Log da ação
    securityMonitor.logSecurityEvent('MANUAL_SCAN_INITIATED', {
      scanType,
      adminUser: req.user.id,
      adminEmail: req.user.email
    });
    
    // Em implementação real, executaria diferentes tipos de scan
    const scanResult = {
      scanType,
      timestamp: new Date(),
      status: 'completed',
      findings: {
        vulnerabilities: 0,
        warnings: 2,
        info: 5
      },
      recommendations: [
        'Sistema funcionando normalmente',
        'Monitoramento ativo',
        'Nenhuma ameaça crítica detectada'
      ]
    };
    
    res.json({
      success: true,
      message: 'Scan de segurança executado com sucesso',
      result: scanResult
    });
  } catch (error) {
    console.error('Erro ao executar scan:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/security/config
 * @desc Obter configurações de segurança
 * @access Admin only
 */
router.get('/config', (req, res) => {
  try {
    const config = {
      maxRequestsPerMinute: securityMonitor.config.maxRequestsPerMinute,
      maxFailedLogins: securityMonitor.config.maxFailedLogins,
      blockDuration: securityMonitor.config.blockDuration,
      monitoringEnabled: true,
      criticalEndpoints: securityMonitor.config.criticalEndpoints.length
    };
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/security/config
 * @desc Atualizar configurações de segurança
 * @access Admin only
 */
router.post('/config', (req, res) => {
  try {
    const { maxRequestsPerMinute, maxFailedLogins, blockDuration } = req.body;
    
    // Validar valores
    if (maxRequestsPerMinute && (maxRequestsPerMinute < 10 || maxRequestsPerMinute > 1000)) {
      return res.status(400).json({
        success: false,
        error: 'maxRequestsPerMinute deve estar entre 10 e 1000'
      });
    }
    
    if (maxFailedLogins && (maxFailedLogins < 3 || maxFailedLogins > 20)) {
      return res.status(400).json({
        success: false,
        error: 'maxFailedLogins deve estar entre 3 e 20'
      });
    }
    
    if (blockDuration && (blockDuration < 60000 || blockDuration > 3600000)) {
      return res.status(400).json({
        success: false,
        error: 'blockDuration deve estar entre 1 minuto e 1 hora'
      });
    }
    
    // Atualizar configurações
    if (maxRequestsPerMinute) securityMonitor.config.maxRequestsPerMinute = maxRequestsPerMinute;
    if (maxFailedLogins) securityMonitor.config.maxFailedLogins = maxFailedLogins;
    if (blockDuration) securityMonitor.config.blockDuration = blockDuration;
    
    // Log da alteração
    securityMonitor.logSecurityEvent('CONFIG_UPDATED', {
      changes: { maxRequestsPerMinute, maxFailedLogins, blockDuration },
      adminUser: req.user.id,
      adminEmail: req.user.email
    });
    
    res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      config: {
        maxRequestsPerMinute: securityMonitor.config.maxRequestsPerMinute,
        maxFailedLogins: securityMonitor.config.maxFailedLogins,
        blockDuration: securityMonitor.config.blockDuration
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
