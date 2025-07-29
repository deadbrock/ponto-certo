import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface PresencaData {
  data: string;
  presente: number;
  total: number;
}

interface TipoBatidaData {
  tipo: string;
  quantidade: number;
  cor: string;
}



interface ColaboradorRanking {
  id: number;
  nome: string;
  pontualidade: number;
  departamento: string;
  avatar?: string;
}

const DashboardAnalytics: React.FC = () => {
  const [presencaUltimos30Dias, setPresencaUltimos30Dias] = useState<PresencaData[]>([]);
  const [tiposBatida, setTiposBatida] = useState<TipoBatidaData[]>([]);
  const [rankingColaboradores, setRankingColaboradores] = useState<ColaboradorRanking[]>([]);
  const [estatisticasGerais, setEstatisticasGerais] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosAnalytics();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const carregarDadosAnalytics = async () => {
    try {
      setLoading(true);
      
      // Carregar dados reais do backend usando API com autenticação
      const [presencaResponse, tiposBatidaResponse, rankingResponse, estatisticasResponse] = await Promise.all([
        api.get('/analytics/presenca-30-dias'),
        api.get('/analytics/tipos-batida'),
        api.get('/analytics/ranking-colaboradores'),
        api.get('/analytics/estatisticas-gerais')
      ]);

      // Processar dados de presença
      setPresencaUltimos30Dias(presencaResponse.data.dados || []);

      // Processar dados de tipos de batida
      setTiposBatida(tiposBatidaResponse.data.dados || []);

      // Processar ranking de colaboradores
      setRankingColaboradores(rankingResponse.data.dados || []);

      // Processar estatísticas gerais
      setEstatisticasGerais(estatisticasResponse.data.dados || {});

    } catch (error) {
      console.error('Erro ao carregar dados de analytics:', error);
      // Em caso de erro, manter arrays vazios
      setPresencaUltimos30Dias([]);
      setTiposBatida([]);
      setRankingColaboradores([]);
    } finally {
      setLoading(false);
    }
  };



  // Configuração simplificada do gráfico de linha
  const configGraficoLinha = {
    labels: presencaUltimos30Dias.map(item => 
      format(parseISO(item.data), 'dd/MM', { locale: ptBR })
    ),
    datasets: [
      {
        label: 'Presença Diária (%)',
        data: presencaUltimos30Dias.map(item => 
          ((item.presente / item.total) * 100).toFixed(1)
        ),
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const opcoesGraficoLinha = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Evolução de Presença - Últimos 30 Dias'
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 85,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          }
        }
      }
    }
  };

  // Configuração simplificada do gráfico de pizza
  const configGraficoPizza = {
    labels: tiposBatida.map(item => item.tipo),
    datasets: [
      {
        data: tiposBatida.map(item => item.quantidade),
        backgroundColor: tiposBatida.map(item => item.cor),
        borderColor: '#ffffff',
        borderWidth: 3,
      },
    ],
  };

  const opcoesGraficoPizza = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Distribuição por Tipo de Batida'
      }
    }
  };

  const getPontualidadeIcon = (pontualidade: number) => {
    if (pontualidade >= 98) return '🏆';
    if (pontualidade >= 95) return '⭐';
    return '📈';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Carregando analytics...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
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
          📊 Analytics - FG Services
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            color: '#64748b',
            fontWeight: 400,
            fontSize: '1.1rem'
          }}
        >
          Análise de desempenho das equipes de limpeza nos clientes
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Gráfico de Evolução de Presença */}
        <Grid xs={12} lg={8}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', height: '400px' }}>
            <CardContent sx={{ p: 3, height: '100%' }}>
              <Box sx={{ height: 'calc(100% - 20px)' }}>
                <Line data={configGraficoLinha} options={opcoesGraficoLinha} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Equipe em Destaque */}
        <Grid xs={12} lg={4}>
          <Card sx={{
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            height: '400px',
            overflow: 'hidden'
          }}>
            <CardContent sx={{ p: 3, height: '100%' }}>
              <Box display="flex" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  🏆 Equipe em Destaque
                </Typography>
              </Box>
              <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="80%">
                <Box 
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)'
                  }}
                >
                  <Typography variant="h3" fontWeight="bold" color="white">
                    🥇
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight="bold" textAlign="center" gutterBottom>
                  {estatisticasGerais.melhor_equipe || 'Sistema Aguardando Dados'}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" mb={2}>
                  {estatisticasGerais.melhor_presenca || '0%'} de presença este mês
                </Typography>
                <Box display="flex" gap={1} alignItems="center">
                  <Typography variant="h4" fontWeight="bold" color="#4caf50">
                    {estatisticasGerais.crescimento_presenca || '0%'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    vs. mês anterior
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráfico de Pizza - Tipos de Batida */}
        <Grid xs={12} lg={6}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', height: '450px' }}>
            <CardContent sx={{ p: 3, height: '100%' }}>
              <Box sx={{ height: 'calc(100% - 20px)' }}>
                <Pie data={configGraficoPizza} options={opcoesGraficoPizza} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Ranking Top 5 Colaboradores */}
        <Grid xs={12} lg={6}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', height: '450px' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  👥 Top 5 Colaboradores
                </Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 60px)', overflow: 'auto' }}>
                {rankingColaboradores.map((colaborador, index) => (
                  <Box
                    key={colaborador.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 2,
                      mb: 1,
                      borderRadius: 2,
                      background: index === 0 ? 'linear-gradient(135deg, #ffd700 0%, #ffed4a 100%)' :
                                  index === 1 ? 'linear-gradient(135deg, #c0c0c0 0%, #d4d4d4 100%)' :
                                  index === 2 ? 'linear-gradient(135deg, #cd7f32 0%, #daa520 100%)' :
                                  '#f8f9fa',
                      border: `2px solid ${
                        index === 0 ? '#ffd700' :
                        index === 1 ? '#c0c0c0' :
                        index === 2 ? '#cd7f32' : '#e9ecef'
                      }`,
                      position: 'relative'
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: index === 0 ? '#ffd700' :
                                    index === 1 ? '#c0c0c0' :
                                    index === 2 ? '#cd7f32' : '#6c757d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {colaborador.nome}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {colaborador.departamento}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" fontWeight="bold" color={index < 3 ? '#1976d2' : '#6c757d'}>
                        {colaborador.pontualidade}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getPontualidadeIcon(colaborador.pontualidade)}
                      </Typography>
                    </Box>
                    {index === 0 && (
                      <Box sx={{ position: 'absolute', top: -5, right: -5 }}>
                        <Typography variant="h4">👑</Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card de Estatísticas Gerais */}
        <Grid xs={12}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              📈 Estatísticas Gerais da FG Services
            </Typography>
            <Grid container spacing={3}>
              <Grid xs={12} md={3}>
                <Box textAlign="center" p={2} bgcolor="#f8f9fa" borderRadius={2}>
                  <Typography variant="h4" fontWeight="bold" color="#1976d2">
                    {estatisticasGerais.colaboradores_ativos || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Colaboradores Ativos</Typography>
                </Box>
              </Grid>
              <Grid xs={12} md={3}>
                <Box textAlign="center" p={2} bgcolor="#f8f9fa" borderRadius={2}>
                  <Typography variant="h4" fontWeight="bold" color="#4caf50">
                    {estatisticasGerais.presenca_media || '0%'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Presença Média</Typography>
                </Box>
              </Grid>
              <Grid xs={12} md={3}>
                <Box textAlign="center" p={2} bgcolor="#f8f9fa" borderRadius={2}>
                  <Typography variant="h4" fontWeight="bold" color="#ff9800">
                    {estatisticasGerais.equipes_ativas || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Equipes Ativas</Typography>
                </Box>
              </Grid>
              <Grid xs={12} md={3}>
                <Box textAlign="center" p={2} bgcolor="#f8f9fa" borderRadius={2}>
                  <Typography variant="h4" fontWeight="bold" color="#9c27b0">
                    {estatisticasGerais.clientes_atendidos || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Clientes Atendidos</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardAnalytics; 