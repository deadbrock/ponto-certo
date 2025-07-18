import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { format, subMonths, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardContratos, Contrato } from '../../types/contratos';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

interface DashboardContratosProps {
  contratoId?: string; // Se especificado, mostra dashboard para um contrato específico
  onExportData?: () => void;
}

const DashboardContratosComponent: React.FC<DashboardContratosProps> = ({
  contratoId,
  onExportData
}) => {
  const [dashboard, setDashboard] = useState<DashboardContratos | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<'30' | '90' | '180' | '365'>('90');
  const [error, setError] = useState<string | null>(null);

  // Carregar dados do dashboard
  const carregarDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = contratoId 
        ? `/api/contratos/${contratoId}/dashboard`
        : `/api/contratos/dashboard?periodo=${periodo}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
        
        if (!contratoId) {
          setContratos(data.contratos || []);
        }
      } else {
        throw new Error('Erro ao carregar dashboard');
      }
    } catch (error) {
      setError('Erro de conexão com o servidor');
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDashboard();
  }, [contratoId, periodo]);

  // Dados para gráfico de distribuição por status
  const dadosStatusChart = dashboard ? {
    labels: dashboard.distribuicaoStatus.map(item => item.label),
    datasets: [{
      label: 'Contratos por Status',
      data: dashboard.distribuicaoStatus.map(item => item.value),
      backgroundColor: dashboard.distribuicaoStatus.map(item => item.color),
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  } : null;

  // Dados para gráfico de evolução mensal (simulado)
  const getEvolucaoMensal = () => {
    const meses = [];
    const valores = [];
    const colaboradores = [];

    for (let i = 5; i >= 0; i--) {
      const data = subMonths(new Date(), i);
      meses.push(format(data, 'MMM/yy', { locale: ptBR }));
      
      // Simulação de dados - seria substituído por dados reais da API
      valores.push(Math.random() * 1000000 + 500000);
      colaboradores.push(Math.floor(Math.random() * 50) + 100);
    }

    return {
      labels: meses,
      datasets: [
        {
          label: 'Valor Total (R$)',
          data: valores,
          borderColor: 'rgb(25, 118, 210)',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          yAxisID: 'y',
        },
        {
          label: 'Colaboradores Totais',
          data: colaboradores,
          borderColor: 'rgb(76, 175, 80)',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          yAxisID: 'y1',
        }
      ]
    };
  };

  // Dados para gráfico de contratos por cliente (top 10)
  const getContratosPorCliente = () => {
    if (!contratos.length) return null;

    const clientesCount = contratos.reduce((acc, contrato) => {
      acc[contrato.cliente] = (acc[contrato.cliente] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topClientes = Object.entries(clientesCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return {
      labels: topClientes.map(([cliente]) => cliente),
      datasets: [{
        label: 'Número de Contratos',
        data: topClientes.map(([,count]) => count),
        backgroundColor: [
          '#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2',
          '#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2'
        ],
        borderRadius: 4
      }]
    };
  };

  // Obter tendência
  const getTendencia = (valor: number, valorAnterior: number) => {
    const diferenca = valor - valorAnterior;
    const percentual = valorAnterior > 0 ? (diferenca / valorAnterior) * 100 : 0;
    return {
      valor: diferenca,
      percentual,
      positiva: diferenca >= 0
    };
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h5" gutterBottom>
          {contratoId ? 'Dashboard do Contrato' : 'Dashboard de Contratos'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Carregando dados...
        </Typography>
      </Box>
    );
  }

  if (error || !dashboard) {
    return (
      <Box p={3}>
        <Typography variant="h5" gutterBottom>
          Dashboard de Contratos
        </Typography>
        <Typography variant="body2" color="error">
          {error || 'Erro ao carregar dados'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Cabeçalho */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            {contratoId ? 'Dashboard do Contrato' : 'Dashboard de Contratos'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {contratoId ? 'Análise detalhada do contrato' : 'Visão geral dos contratos em vigor'}
          </Typography>
        </Box>

        <Box display="flex" gap={2} alignItems="center">
          {!contratoId && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Período</InputLabel>
              <Select
                value={periodo}
                label="Período"
                onChange={(e) => setPeriodo(e.target.value as any)}
              >
                <MenuItem value="30">30 dias</MenuItem>
                <MenuItem value="90">90 dias</MenuItem>
                <MenuItem value="180">6 meses</MenuItem>
                <MenuItem value="365">1 ano</MenuItem>
              </Select>
            </FormControl>
          )}

          <Tooltip title="Atualizar dados">
            <IconButton onClick={carregarDashboard}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Button
            startIcon={<ExportIcon />}
            variant="outlined"
            onClick={onExportData}
          >
            Exportar
          </Button>
        </Box>
      </Box>

      {/* Cards de KPIs principais */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total de Contratos
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {dashboard.totalContratos}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUpIcon fontSize="small" color="success" />
                    <Typography variant="caption" color="success.main" ml={0.5}>
                      +5% este mês
                    </Typography>
                  </Box>
                </Box>
                <BusinessIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Contratos Ativos
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {dashboard.contratosAtivos}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      {((dashboard.contratosAtivos / dashboard.totalContratos) * 100).toFixed(1)}% do total
                    </Typography>
                  </Box>
                </Box>
                <CheckIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Valor Total
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {dashboard.valorTotalContratos.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      notation: 'compact',
                      maximumFractionDigits: 1
                    })}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUpIcon fontSize="small" color="success" />
                    <Typography variant="caption" color="success.main" ml={0.5}>
                      +12% este período
                    </Typography>
                  </Box>
                </Box>
                <MoneyIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Colaboradores
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {dashboard.colaboradoresTotais}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      Média: {(dashboard.colaboradoresTotais / dashboard.totalContratos).toFixed(1)} por contrato
                    </Typography>
                  </Box>
                </Box>
                <PeopleIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alertas críticos */}
      {dashboard.alertasVigencia.length > 0 && (
        <Card sx={{ mb: 4, borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <WarningIcon color="warning" />
              <Typography variant="h6">
                Alertas de Vigência ({dashboard.alertasVigencia.length})
              </Typography>
            </Box>
            <List dense>
              {dashboard.alertasVigencia.slice(0, 5).map((alerta, index) => (
                <ListItem key={alerta.id}>
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: alerta.prioridade === 'critica' ? 'error.main' : 'warning.main'
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={alerta.mensagem}
                    secondary={format(new Date(alerta.dataAlerta), 'dd/MM/yyyy HH:mm')}
                  />
                  <Chip
                    label={alerta.prioridade.toUpperCase()}
                    size="small"
                    color={alerta.prioridade === 'critica' ? 'error' : 'warning'}
                  />
                </ListItem>
              ))}
            </List>
            {dashboard.alertasVigencia.length > 5 && (
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                + {dashboard.alertasVigencia.length - 5} outros alertas
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <Grid container spacing={3}>
        {/* Distribuição por Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distribuição por Status
              </Typography>
              {dadosStatusChart && (
                <Box height={300}>
                  <Doughnut
                    data={dadosStatusChart}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                              const percentage = ((context.raw as number / total) * 100).toFixed(1);
                              return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Contratos por Cliente */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top 10 Clientes
              </Typography>
              {getContratosPorCliente() && (
                <Box height={300}>
                  <Bar
                    data={getContratosPorCliente()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1
                          }
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Evolução Mensal */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Evolução nos Últimos 6 Meses
              </Typography>
              <Box height={400}>
                <Line
                  data={getEvolucaoMensal()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      mode: 'index' as const,
                      intersect: false,
                    },
                    scales: {
                      x: {
                        display: true,
                        title: {
                          display: true,
                          text: 'Período'
                        }
                      },
                      y: {
                        type: 'linear' as const,
                        display: true,
                        position: 'left' as const,
                        title: {
                          display: true,
                          text: 'Valor (R$)'
                        },
                        ticks: {
                          callback: function(value) {
                            return new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              notation: 'compact'
                            }).format(value as number);
                          }
                        }
                      },
                      y1: {
                        type: 'linear' as const,
                        display: true,
                        position: 'right' as const,
                        title: {
                          display: true,
                          text: 'Colaboradores'
                        },
                        grid: {
                          drawOnChartArea: false,
                        },
                      },
                    },
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                              label += ': ';
                            }
                            if (context.datasetIndex === 0) {
                              label += new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(context.raw as number);
                            } else {
                              label += context.raw;
                            }
                            return label;
                          }
                        }
                      }
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardContratosComponent; 