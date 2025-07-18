import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  TextField,
  Button,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Tooltip,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ExpandMore as ExpandMoreIcon,
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Computer as SystemIcon,
  Work as WorkIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  VolumeUp as VolumeIcon
} from '@mui/icons-material';
import { notificationService, NotificationRule } from '../services/notificationService';
import { useToast } from '../contexts/ToastContext';

const ConfiguracoesNotificacoes: React.FC = () => {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(30);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = () => {
    const currentRules = notificationService.getRules();
    setRules([...currentRules]);
  };

  const handleRuleToggle = (ruleId: string) => {
    const updatedRules = rules.map(rule => 
      rule.id === ruleId 
        ? { ...rule, enabled: !rule.enabled }
        : rule
    );
    setRules(updatedRules);
  };

  const handleCooldownChange = (ruleId: string, newValue: number) => {
    const updatedRules = rules.map(rule => 
      rule.id === ruleId 
        ? { ...rule, cooldown: newValue }
        : rule
    );
    setRules(updatedRules);
  };

  const handlePriorityChange = (ruleId: string, newPriority: string) => {
    const updatedRules = rules.map(rule => 
      rule.id === ruleId 
        ? { ...rule, priority: newPriority as any }
        : rule
    );
    setRules(updatedRules);
  };

  const handleSave = () => {
    rules.forEach(rule => {
      notificationService.updateRule(rule.id, {
        enabled: rule.enabled,
        cooldown: rule.cooldown,
        priority: rule.priority
      });
    });

    setSaveMessage('✅ Configurações salvas com sucesso!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const getRuleIcon = (ruleId: string) => {
    switch (ruleId) {
      case 'atraso-colaborador':
        return <ScheduleIcon sx={{ color: '#ff9800' }} />;
      case 'falta-nao-justificada':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      case 'presenca-baixa-equipe':
        return <PeopleIcon sx={{ color: '#2196f3' }} />;
      case 'equipamento-manutencao':
        return <SystemIcon sx={{ color: '#9c27b0' }} />;
      case 'meta-mensal-risco':
        return <WarningIcon sx={{ color: '#ff5722' }} />;
      case 'backup-concluido':
        return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
      default:
        return <NotificationsIcon sx={{ color: '#666' }} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#f44336';
      case 'high':
        return '#ff9800';
      case 'medium':
        return '#2196f3';
      case 'low':
      default:
        return '#4caf50';
    }
  };

  const testNotification = () => {
    notificationService.addNotification({
      id: `test-${Date.now()}`,
      type: 'info',
      title: '🧪 Teste de Notificação',
      message: 'Esta é uma notificação de teste para verificar o funcionamento do sistema.',
      timestamp: new Date(),
      read: false,
      priority: 'medium',
      category: 'sistema'
    });
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box mb={4}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1
          }}
        >
          🔔 Configurações de Notificações
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure as regras automáticas de notificações para o sistema da FG Services
        </Typography>
      </Box>

      {saveMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {saveMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Configurações Gerais */}
        <Grid xs={12} md={4}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationsIcon sx={{ color: '#1976d2' }} />
                Configurações Gerais
              </Typography>
              
              <Box mt={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={soundEnabled}
                      onChange={(e) => setSoundEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <VolumeIcon fontSize="small" />
                      Som das Notificações
                    </Box>
                  }
                />
              </Box>

              <Box mt={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Atualização Automática (segundos)
                </Typography>
                <Slider
                  value={autoRefresh}
                  onChange={(e, value) => setAutoRefresh(value as number)}
                  min={10}
                  max={120}
                  step={10}
                  marks={[
                    { value: 10, label: '10s' },
                    { value: 60, label: '1min' },
                    { value: 120, label: '2min' }
                  ]}
                  valueLabelDisplay="auto"
                  sx={{ mt: 2 }}
                />
              </Box>

              <Box mt={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showCriticalOnly}
                      onChange={(e) => setShowCriticalOnly(e.target.checked)}
                      color="error"
                    />
                  }
                  label="Mostrar apenas críticas"
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              <Button
                variant="outlined"
                onClick={testNotification}
                startIcon={<NotificationsIcon />}
                fullWidth
                sx={{ mb: 2 }}
              >
                Testar Notificação
              </Button>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Testar Toasts:
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    onClick={() => toast.showSuccess('✅ Configuração salva com sucesso!')}
                  >
                    Sucesso
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => toast.showError('❌ Erro ao conectar com o servidor')}
                  >
                    Erro
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={() => toast.showWarning('⚠️ Verifique a configuração')}
                  >
                    Aviso
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="info"
                    onClick={() => toast.showInfo('ℹ️ Sistema atualizado')}
                  >
                    Info
                  </Button>
                </Box>
              </Box>

              <Button
                variant="contained"
                onClick={handleSave}
                startIcon={<SaveIcon />}
                fullWidth
              >
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Regras de Notificação */}
        <Grid xs={12} md={8}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WorkIcon sx={{ color: '#1976d2' }} />
                  Regras Automáticas da FG Services
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={loadRules}
                  startIcon={<RefreshIcon />}
                >
                  Atualizar
                </Button>
              </Box>

              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Cooldown:</strong> Tempo mínimo entre notificações da mesma regra para evitar spam.
                </Typography>
              </Alert>

              {rules.map((rule) => (
                <Accordion 
                  key={rule.id}
                  sx={{ 
                    mb: 2, 
                    borderRadius: '12px !important',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    '&:before': { display: 'none' }
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                      borderRadius: '12px',
                      '& .MuiAccordionSummary-content': {
                        alignItems: 'center'
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2} width="100%">
                      {getRuleIcon(rule.id)}
                      <Box flex={1}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {rule.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {rule.condition}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={rule.priority.toUpperCase()}
                          size="small"
                          sx={{
                            bgcolor: getPriorityColor(rule.priority),
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                        <Switch
                          checked={rule.enabled}
                          onChange={() => handleRuleToggle(rule.id)}
                          onClick={(e) => e.stopPropagation()}
                          color="primary"
                        />
                      </Box>
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Grid container spacing={3}>
                      <Grid xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Cooldown (minutos)
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          value={rule.cooldown}
                          onChange={(e) => handleCooldownChange(rule.id, parseInt(e.target.value))}
                          inputProps={{ min: 1, max: 60 }}
                          sx={{ width: '100%' }}
                        />
                      </Grid>

                      <Grid xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Prioridade
                        </Typography>
                        <FormControl size="small" sx={{ width: '100%' }}>
                          <Select
                            value={rule.priority}
                            onChange={(e) => handlePriorityChange(rule.id, e.target.value as 'low' | 'medium' | 'high' | 'critical')}
                          >
                            <MenuItem value="low">Baixa</MenuItem>
                            <MenuItem value="medium">Média</MenuItem>
                            <MenuItem value="high">Alta</MenuItem>
                            <MenuItem value="critical">Crítica</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                    {rule.lastTriggered && (
                      <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={2}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Último disparo:</strong> {rule.lastTriggered.toLocaleString('pt-BR')}
                        </Typography>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Estatísticas */}
      <Box mt={4}>
        <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              📊 Estatísticas de Notificações
            </Typography>
            
            <Grid container spacing={3} mt={1}>
              <Grid xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {rules.filter(r => r.enabled).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Regras Ativas
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h4" color="error" fontWeight="bold">
                    {rules.filter(r => r.priority === 'critical').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Críticas
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {notificationService.getNotifications().length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Notificações
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {notificationService.getUnreadCount()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Não Lidas
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default ConfiguracoesNotificacoes; 