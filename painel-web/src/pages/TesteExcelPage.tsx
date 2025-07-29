import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Grid, Chip, CircularProgress, Alert, Divider
} from '@mui/material';
import {
  TableView as TableIcon,
  People as PeopleIcon,
  Dashboard as DashboardIcon,
  AttachMoney as FinanceIcon,
  ReportProblem as NonConformIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { ExcelService, RegistroPonto as RegistroExcel, ColaboradorResumo } from '../services/excelService';
import api from '../services/api';

const TesteExcelPage: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const showLoading = (tipo: string) => setLoading(tipo);
  const hideLoading = () => setLoading(null);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  // 1. Teste de Registros Detalhados
  const testarRegistrosDetalhados = async () => {
    showLoading('registros');
    try {
      // Buscar dados reais do backend usando API autenticada
      let registros: RegistroExcel[] = [];
      
      try {
        const response = await api.get('/relatorios/registros-detalhados');
        registros = response.data.registros || [];
      } catch (error) {
        console.warn('Backend não disponível, usando dados vazios', error);
      }

      await ExcelService.exportarRegistrosPonto(
        registros,
        { inicio: '01/01/2025', fim: '31/01/2025' },
        { equipe: 'Todas', cliente: 'Todos' }
      );
      
      showMessage('✅ Relatório de Registros Detalhados exportado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      showMessage('❌ Erro ao exportar registros detalhados');
    } finally {
      hideLoading();
    }
  };

  // 2. Teste de Relatório de Presença
  const testarRelatorioPresenca = async () => {
    showLoading('presenca');
    try {
      // Buscar dados reais do backend usando API autenticada
      let colaboradores: ColaboradorResumo[] = [];
      
      try {
        const response = await api.get('/relatorios/presenca-colaboradores');
        colaboradores = response.data.colaboradores || [];
      } catch (error) {
        console.warn('Backend não disponível, usando dados vazios', error);
      }

      await ExcelService.exportarRelatorioPresenca(colaboradores, 'Janeiro 2025');
      showMessage('✅ Relatório de Presença exportado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      showMessage('❌ Erro ao exportar relatório de presença');
    } finally {
      hideLoading();
    }
  };

  // 3. Teste de Dashboard Executivo
  const testarDashboardExecutivo = async () => {
    showLoading('dashboard');
    try {
      await ExcelService.exportarDashboardExecutivo({});
      showMessage('✅ Dashboard Executivo exportado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      showMessage('❌ Erro ao exportar dashboard executivo');
    } finally {
      hideLoading();
    }
  };

  // 4. Teste de Relatório Financeiro
  const testarRelatorioFinanceiro = async () => {
    showLoading('financeiro');
    try {
      await ExcelService.exportarRelatorioFinanceiro('Janeiro 2025');
      showMessage('✅ Relatório Financeiro exportado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      showMessage('❌ Erro ao exportar relatório financeiro');
    } finally {
      hideLoading();
    }
  };

  // 5. Teste de Não Conformidades
  const testarNaoConformidades = async () => {
    showLoading('naoconform');
    try {
      await ExcelService.exportarNaoConformidades('Janeiro 2025');
      showMessage('✅ Relatório de Não Conformidades exportado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      showMessage('❌ Erro ao exportar não conformidades');
    } finally {
      hideLoading();
    }
  };

  const relatorios = [
    {
      id: 'registros',
      titulo: 'Registros Detalhados',
      descricao: 'Relatório completo com todos os registros de ponto por período, incluindo horários de entrada, saída, almoço e horas trabalhadas.',
      icon: <TableIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
      handler: testarRegistrosDetalhados,
      features: ['Filtros por período', 'Dados por colaborador/equipe', 'Cálculo de horas', 'Resumo estatístico']
    },
    {
      id: 'presenca',
      titulo: 'Relatório de Presença',
      descricao: 'Análise de presença por colaborador com indicadores de performance, atrasos, faltas e percentual de presença.',
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: '#4caf50',
      background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
      handler: testarRelatorioPresenca,
      features: ['Análise por colaborador', 'Indicadores visuais', 'Status de performance', 'Estatísticas gerais']
    },
    {
      id: 'dashboard',
      titulo: 'Dashboard Executivo',
      descricao: 'Relatório executivo com indicadores principais, análise por equipe e resumo organizacional.',
      icon: <DashboardIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
      background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
      handler: testarDashboardExecutivo,
      features: ['Múltiplas abas', 'Indicadores KPI', 'Análise por cliente', 'Resumo executivo']
    },
    {
      id: 'financeiro',
      titulo: 'Relatório Financeiro',
      descricao: 'Relatório detalhado de horas trabalhadas com valores monetários, horas extras e totais por colaborador.',
      icon: <FinanceIcon sx={{ fontSize: 40 }} />,
      color: '#ff9800',
      background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
      handler: testarRelatorioFinanceiro,
      features: ['Cálculos financeiros', 'Horas normais/extras', 'Valores por cargo', 'Totais consolidados']
    },
    {
      id: 'naoconform',
      titulo: 'Não Conformidades',
      descricao: 'Relatório de não conformidades com classificação por impacto, ações tomadas e status de resolução.',
      icon: <NonConformIcon sx={{ fontSize: 40 }} />,
      color: '#f44336',
      background: 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)',
      handler: testarNaoConformidades,
      features: ['Classificação de risco', 'Rastreamento de ações', 'Status colorido', 'Histórico completo']
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
        🧪 Teste de Exportação Excel - FG Services
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Demonstração das 5 funcionalidades avançadas de exportação Excel implementadas no sistema.
      </Typography>

      {message && (
        <Alert 
          severity={message.includes('✅') ? 'success' : 'error'} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {relatorios.map((relatorio) => (
          <Grid xs={12} md={6} lg={4} key={relatorio.id}>
            <Card 
              sx={{ 
                height: '100%',
                background: 'white',
                border: `2px solid ${relatorio.color}20`,
                borderRadius: '16px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: `0 12px 40px ${relatorio.color}25`,
                  border: `2px solid ${relatorio.color}40`
                }
              }}
            >
              <Box
                sx={{
                  height: 80,
                  background: relatorio.background,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '16px 16px 0 0'
                }}
              >
                <Box sx={{ color: 'white' }}>
                  {relatorio.icon}
                </Box>
              </Box>
              
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                  {relatorio.titulo}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                  {relatorio.descricao}
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#666' }}>
                    Funcionalidades:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {relatorio.features.map((feature, index) => (
                      <Chip
                        key={index}
                        label={feature}
                        size="small"
                        sx={{
                          fontSize: '0.75rem',
                          bgcolor: `${relatorio.color}10`,
                          color: relatorio.color,
                          fontWeight: 500
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={relatorio.handler}
                  disabled={loading === relatorio.id}
                  startIcon={
                    loading === relatorio.id ? 
                    <CircularProgress size={16} color="inherit" /> : 
                    <DownloadIcon />
                  }
                  sx={{
                    background: relatorio.background,
                    boxShadow: `0 4px 12px ${relatorio.color}30`,
                    '&:hover': {
                      background: relatorio.background,
                      boxShadow: `0 6px 20px ${relatorio.color}40`,
                    },
                    '&:disabled': {
                      background: '#e0e0e0'
                    }
                  }}
                >
                  {loading === relatorio.id ? 'Gerando...' : 'Testar Exportação'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />
      
      <Box sx={{ textAlign: 'center', p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
          📋 Informações Técnicas
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Todos os relatórios são gerados com a identidade visual da FG Services, incluindo logo, cores corporativas e formatação profissional.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Chip label="ExcelJS 4.4.0" color="primary" size="small" />
          <Chip label="Formatação Avançada" color="secondary" size="small" />
          <Chip label="Múltiplas Abas" color="success" size="small" />
          <Chip label="Dados da FG Services" color="warning" size="small" />
          <Chip label="Identidade Visual" color="info" size="small" />
        </Box>
      </Box>
    </Box>
  );
};

export default TesteExcelPage; 