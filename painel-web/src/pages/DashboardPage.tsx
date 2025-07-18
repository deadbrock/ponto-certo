import React from 'react';
import {
  Typography, Box, Card, CardContent, Avatar, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress, Divider, Paper, Alert, AlertTitle, Fab, CircularProgress
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  People as PeopleIcon,
  AccessTime as AccessTimeIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Login as EntradaIcon,
  Logout as SaidaIcon,
  Restaurant as AlmocoIcon,
  Schedule as HorarioIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  Backup as BackupIcon,
  Business as BusinessIcon,
  Groups as GroupsIcon,
  GetApp as ExportIcon
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { ExcelService } from '../services/excelService';
import { api } from '../services/api';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle, trend }) => (
  <Card 
    sx={{ 
      height: '100%', 
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
      border: `2px solid ${color}20`,
      borderRadius: '16px',
      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 8px 25px ${color}25`
      }
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Avatar 
          sx={{ 
            bgcolor: color, 
            width: 60, 
            height: 60,
            boxShadow: `0 6px 20px ${color}30`
          }}
        >
          {icon}
        </Avatar>
        {trend && (
          <Chip 
            label={trend} 
            size="small" 
            sx={{
              bgcolor: trend.includes('+') ? '#e8f5e8' : '#ffe8e8',
              color: trend.includes('+') ? '#2e7d2e' : '#d32f2f',
              fontWeight: 600,
              fontSize: '11px',
              '& .MuiChip-icon': {
                color: trend.includes('+') ? '#2e7d2e' : '#d32f2f'
              }
            }}
            icon={<TrendingUpIcon sx={{ fontSize: '16px !important' }} />}
          />
        )}
      </Box>
      <Typography 
        variant="h3" 
        component="div" 
        sx={{ 
          fontWeight: 700, 
          color: color,
          fontSize: '2.5rem',
          lineHeight: 1.2,
          mb: 1
        }}
      >
        {value}
      </Typography>
      <Typography 
        variant="h6" 
        sx={{ 
          color: '#1a1a1a', 
          fontWeight: 600,
          fontSize: '1.1rem',
          mb: 0.5
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#6b7280',
            fontSize: '0.9rem'
          }}
        >
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const getAcaoIcon = (acao: string) => {
  if (acao.includes('Entrada')) return <EntradaIcon sx={{ color: '#4caf50', fontSize: 18 }} />;
  if (acao.includes('Saída') && !acao.includes('Almoço')) return <SaidaIcon sx={{ color: '#f44336', fontSize: 18 }} />;
  if (acao.includes('Almoço')) return <AlmocoIcon sx={{ color: '#ff9800', fontSize: 18 }} />;
  if (acao.includes('Volta')) return <HorarioIcon sx={{ color: '#2196f3', fontSize: 18 }} />;
  return <AccessTimeIcon sx={{ color: '#9e9e9e', fontSize: 18 }} />;
};

const getAlertIcon = (tipo: string) => {
  if (tipo === 'warning') return <WarningIcon sx={{ color: '#f57c00', fontSize: 20 }} />;
  if (tipo === 'success') return <CheckIcon sx={{ color: '#4caf50', fontSize: 20 }} />;
  if (tipo === 'info') return <BackupIcon sx={{ color: '#1976d2', fontSize: 20 }} />;
  return <InfoIcon sx={{ color: '#9e9e9e', fontSize: 20 }} />;
};

const DashboardPage: React.FC = () => {
  const [loadingExport, setLoadingExport] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<any[]>([]);
  const [registrosRecentes, setRegistrosRecentes] = React.useState<any[]>([]);
  const [alertas, setAlertas] = React.useState<any[]>([]);
  const [progressoMensal, setProgressoMensal] = React.useState<any[]>([]);

  // Carregar dados reais do backend
  React.useEffect(() => {
    carregarDadosDashboard();
  }, []);

  const carregarDadosDashboard = async () => {
    try {
      setLoading(true);
      
      // Carregar estatísticas gerais
      const statsResponse = await api.get('/dashboard/estatisticas');
      if (statsResponse.data.success) {
        setStats([
          {
            title: 'Colaboradores Ativos',
            value: statsResponse.data.dados.colaboradores_ativos || 0,
            icon: <PeopleIcon sx={{ fontSize: 28 }} />,
            color: '#1976d2',
            subtitle: 'Total cadastrado no sistema',
            trend: statsResponse.data.dados.trend_colaboradores || 'N/A'
          },
          {
            title: 'Registros Hoje',
            value: statsResponse.data.dados.registros_hoje || 0,
            icon: <AccessTimeIcon sx={{ fontSize: 28 }} />,
            color: '#4caf50',
            subtitle: 'Batidas de ponto registradas',
            trend: statsResponse.data.dados.trend_registros || 'N/A'
          },
          {
            title: 'Atestados Pendentes',
            value: statsResponse.data.dados.atestados_pendentes || 0,
            icon: <AssignmentIcon sx={{ fontSize: 28 }} />,
            color: '#f57c00',
            subtitle: 'Aguardando aprovação',
            trend: statsResponse.data.dados.trend_atestados || 'N/A'
          },
          {
            title: 'Relatórios Gerados',
            value: statsResponse.data.dados.relatorios_mes || 0,
            icon: <AssessmentIcon sx={{ fontSize: 28 }} />,
            color: '#9c27b0',
            subtitle: 'AFD/ACJEF este mês',
            trend: statsResponse.data.dados.trend_relatorios || 'N/A'
          }
        ]);
      }

      // Carregar registros recentes
      const registrosResponse = await api.get('/dashboard/registros-recentes');
      if (registrosResponse.data.success) {
        setRegistrosRecentes(registrosResponse.data.registros || []);
      }

      // Carregar alertas
      const alertasResponse = await api.get('/dashboard/alertas');
      if (alertasResponse.data.success) {
        setAlertas(alertasResponse.data.alertas || []);
      }

      // Carregar progresso mensal
      const progressoResponse = await api.get('/dashboard/progresso-mensal');
      if (progressoResponse.data.success) {
        setProgressoMensal(progressoResponse.data.progresso || []);
      }

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      // Em caso de erro, manter arrays vazios para não quebrar a interface
      setStats([]);
      setRegistrosRecentes([]);
      setAlertas([]);
      setProgressoMensal([]);
    } finally {
      setLoading(false);
    }
  };

  // Função para exportar Dashboard Executivo
  const exportarDashboardExecutivo = async () => {
    setLoadingExport(true);
    try {
      await ExcelService.exportarDashboardExecutivo({});
    } catch (error) {
      console.error('Erro ao exportar dashboard executivo:', error);
    } finally {
      setLoadingExport(false);
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Cabeçalho Melhorado */}
      <Box mb={4}>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '2.5rem',
            letterSpacing: '-1px',
            mb: 1
          }}
        >
          🧹 Ponto Certo FG - Dashboard
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            color: '#64748b',
            fontWeight: 400,
            fontSize: '1.1rem'
          }}
        >
          Controle de ponto das equipes de limpeza terceirizada
        </Typography>
      </Box>

      {/* Cards de Estatísticas Melhorados */}
      <Box display="flex" flexWrap="wrap" gap={3} mb={4}>
        {stats.map((stat, index) => (
          <Box key={index} flex="1 1 280px" minWidth="280px">
            <StatCard {...stat} />
          </Box>
        ))}
      </Box>

      <Box display="flex" flexWrap="wrap" gap={3}>
        {/* Registros Recentes Melhorados */}
        <Box flex="2 1 500px" minWidth="500px">
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" mb={3}>
                <AccessTimeIcon sx={{ mr: 1.5, color: '#1976d2', fontSize: 24 }} />
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    color: '#1a1a1a',
                    fontSize: '1.25rem'
                  }}
                >
                  Registros Recentes
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        Colaborador
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        Ação
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        Horário
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {registrosRecentes.map((registro) => (
                      <TableRow 
                        key={registro.id}
                        sx={{ 
                          '&:hover': { backgroundColor: '#f8fafc' },
                          borderBottom: '1px solid #f1f5f9'
                        }}
                      >
                        <TableCell sx={{ borderBottom: 'none' }}>
                          <Typography 
                            sx={{ 
                              fontWeight: 600, 
                              color: '#1f2937',
                              fontSize: '0.95rem'
                            }}
                          >
                            {registro.colaborador}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ borderBottom: 'none' }}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getAcaoIcon(registro.acao)}
                            <Typography sx={{ fontSize: '0.9rem', color: '#4b5563' }}>
                              {registro.acao}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ borderBottom: 'none' }}>
                          <Typography sx={{ fontFamily: 'monospace', fontWeight: 500, color: '#374151' }}>
                            {registro.horario}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ borderBottom: 'none' }}>
                          <Chip 
                            label={registro.status}
                            size="small"
                            sx={{
                              backgroundColor: registro.status === 'Normal' ? '#dcfce7' : '#fed7d7',
                              color: registro.status === 'Normal' ? '#16a34a' : '#e53e3e',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              border: `1px solid ${registro.status === 'Normal' ? '#bbf7d0' : '#fbb6ce'}`
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Alertas Melhorados */}
        <Box flex="1 1 300px" minWidth="300px">
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" mb={3}>
                <WarningIcon sx={{ mr: 1.5, color: '#f59e0b', fontSize: 24 }} />
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    color: '#1a1a1a',
                    fontSize: '1.25rem'
                  }}
                >
                  ⚠️ Alertas do Sistema
                </Typography>
              </Box>
              <Box>
                {alertas.map((alerta, index) => (
                  <Box key={index}>
                    <Box 
                      display="flex" 
                      alignItems="flex-start" 
                      gap={2}
                      p={2.5} 
                      sx={{
                        backgroundColor: alerta.tipo === 'warning' ? '#fef3c7' : 
                                        alerta.tipo === 'success' ? '#d1fae5' : '#dbeafe',
                        borderRadius: '12px',
                        border: `1px solid ${alerta.tipo === 'warning' ? '#f59e0b' : 
                                               alerta.tipo === 'success' ? '#10b981' : '#3b82f6'}20`
                      }}
                    >
                      {getAlertIcon(alerta.tipo)}
                      <Box flex={1}>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            fontWeight: 600,
                            color: '#1f2937',
                            fontSize: '0.95rem',
                            mb: 0.5
                          }}
                        >
                          {alerta.titulo}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#6b7280',
                            fontSize: '0.85rem',
                            lineHeight: 1.4
                          }}
                        >
                          {alerta.descricao}
                        </Typography>
                      </Box>
                    </Box>
                    {index < alertas.length - 1 && <Box mt={2} />}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Gráfico de Presença Melhorado */}
      <Box mt={3}>
        <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Box display="flex" alignItems="center">
                <AssessmentIcon sx={{ mr: 1.5, color: '#1976d2', fontSize: 24 }} />
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    color: '#1a1a1a',
                    fontSize: '1.25rem'
                  }}
                >
                  Presença por Departamento (Este Mês)
                </Typography>
              </Box>
              <Box 
                display="flex" 
                alignItems="center" 
                gap={2}
                sx={{
                  backgroundColor: '#f8fafc',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#4caf50', borderRadius: '2px' }} />
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                    Acima da Meta
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#ff9800', borderRadius: '2px' }} />
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                    Abaixo da Meta
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box display="flex" flexWrap="wrap" gap={3}>
              {progressoMensal.map((dept, index) => (
                <Box key={index} flex="1 1 220px" minWidth="220px">
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: 600,
                        color: '#1f2937',
                        fontSize: '1rem'
                      }}
                    >
                      {dept.departamento}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#6b7280',
                        fontFamily: 'monospace',
                        fontWeight: 500
                      }}
                    >
                      {dept.presenca}% / {dept.meta}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={dept.presenca} 
                    sx={{ 
                      height: 12, 
                      borderRadius: 6,
                      backgroundColor: '#f1f5f9',
                      overflow: 'hidden',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: dept.presenca >= dept.meta ? '#4caf50' : '#ff9800',
                        borderRadius: 6,
                        transition: 'transform 1.5s ease-in-out'
                      }
                    }} 
                  />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: dept.presenca >= dept.meta ? '#16a34a' : '#ea580c',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      mt: 0.5,
                      display: 'block'
                    }}
                  >
                    {dept.presenca >= dept.meta ? '✓ Meta atingida' : `⚠ ${dept.meta - dept.presenca}% abaixo`}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Cards hardcoded removidos - dados serão vindo dos stats já carregados via API */}
      {/* Os cards principais agora são renderizados dinamicamente via stats[] no início da página */}
      
      <Grid container spacing={3} mt={3}>
        <Grid xs={12} lg={8}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              📋 Registros Recentes de Ponto
            </Typography>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {registrosRecentes.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  Nenhum registro de ponto disponível no momento.
                </Typography>
              ) : (
                registrosRecentes.map((registro: any, index: number) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    mb: 1,
                    borderRadius: 2,
                    backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                    border: '1px solid #e9ecef',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#e3f2fd',
                      transform: 'translateX(4px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <Avatar sx={{ 
                    bgcolor: registro.status === 'no-prazo' ? '#4caf50' : 
                             registro.status === 'atraso' ? '#f44336' : '#2196f3',
                    mr: 2 
                  }}>
                    {registro.colaborador.split(' ').map((n: string) => n[0]).join('')}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {registro.colaborador}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {registro.cliente}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', mr: 2 }}>
                    <Chip
                      icon={
                        registro.acao === 'Entrada' ? <EntradaIcon /> :
                        registro.acao === 'Saída' ? <SaidaIcon /> :
                        registro.acao === 'Saída Almoço' ? <AlmocoIcon /> :
                        <AlmocoIcon />
                      }
                      label={registro.acao}
                      size="small"
                      variant="outlined"
                      sx={{ minWidth: 120 }}
                    />
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {registro.hora}
                    </Typography>
                    <Chip
                      label={
                        registro.status === 'no-prazo' ? 'No prazo' :
                        registro.status === 'atraso' ? 'Atraso' : 'Adiantado'
                      }
                      size="small"
                      color={
                        registro.status === 'no-prazo' ? 'success' :
                        registro.status === 'atraso' ? 'error' : 'info'
                      }
                    />
                  </Box>
                </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid xs={12} lg={4}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', height: 'fit-content' }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              🚨 Alertas do Sistema
            </Typography>
            <Box sx={{ space: 2 }}>
              {alertas.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  Nenhum alerta no momento.
                </Typography>
              ) : (
                alertas.map((alerta: any, index: number) => (
                  <Alert key={index} severity={alerta.tipo} sx={{ mb: 2, borderRadius: 2 }}>
                    <AlertTitle sx={{ fontWeight: 'bold' }}>{alerta.titulo}</AlertTitle>
                    <Typography variant="body2">
                      {alerta.descricao}
                    </Typography>
                  </Alert>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid xs={12}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              📊 Gráfico de Presença por Cliente (Últimos 7 dias)
            </Typography>
            <Box sx={{ height: 300 }}>
              {progressoMensal.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  Dados de progresso não disponíveis.
                </Typography>
              ) : (
                <Line
                  data={{
                    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
                    datasets: progressoMensal.map((item: any, index: number) => ({
                      label: item.departamento,
                      data: item.dados || [],
                      borderColor: ['#1976d2', '#f57c00', '#7b1fa2', '#388e3c'][index] || '#1976d2',
                      backgroundColor: ['rgba(25, 118, 210, 0.1)', 'rgba(245, 124, 0, 0.1)', 'rgba(123, 31, 162, 0.1)', 'rgba(56, 142, 60, 0.1)'][index] || 'rgba(25, 118, 210, 0.1)',
                      tension: 0.4,
                      fill: true
                    }))
                  }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                      labels: {
                        usePointStyle: true,
                        padding: 20
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: function(value) {
                          return value + '%';
                        }
                      }
                    }
                  }
                }}
              />
                )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* FAB para Exportação Dashboard Executivo */}
      <Fab
        color="secondary"
        aria-label="exportar dashboard"
        sx={{ position: 'fixed', bottom: 80, right: 16 }}
        onClick={exportarDashboardExecutivo}
        disabled={loadingExport}
      >
        {loadingExport ? <CircularProgress size={24} color="inherit" /> : <ExportIcon />}
      </Fab>
    </Box>
  );
};

export default DashboardPage; 