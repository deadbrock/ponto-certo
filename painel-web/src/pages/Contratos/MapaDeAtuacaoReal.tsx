import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Alert,
  Chip,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Map as MapIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  Close as CloseIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps';
import { api } from '../../services/api';

// URL do GeoJSON do Brasil
const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

interface EstadosContratos {
  [sigla: string]: 'ativo' | 'proximo' | 'vencido' | 'sem';
}

interface Estatisticas {
  totalEstados: number;
  totalContratos: number;
  totalFuncionarios: number;
  valorTotal: number;
  distribucao: {
    ativo: number;
    proximo: number;
    vencido: number;
    sem: number;
  };
}

interface DetalhesEstado {
  sigla: string;
  nome: string;
  status: 'ativo' | 'proximo' | 'vencido' | 'sem';
  quantidadeContratos: number;
  clientes: string[];
  colaboradores: number;
  valorTotal: number;
}

const MapaDeAtuacaoReal: React.FC = () => {
  const [contratos, setContratos] = useState<EstadosContratos>({});
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [modalAberto, setModalAberto] = useState(false);
  const [estadoSelecionado, setEstadoSelecionado] = useState<DetalhesEstado | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  // Cores por status
  const cores = {
    ativo: '#28a745',    // Verde
    proximo: '#ffc107',  // Amarelo
    vencido: '#dc3545',  // Vermelho
    sem: '#6c757d'       // Cinza
  };

  // Labels dos status
  const statusLabels = {
    ativo: 'Ativo',
    proximo: 'Próximo do Vencimento',
    vencido: 'Vencido',
    sem: 'Sem Contrato'
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);

      const [estadosResponse, estatisticasResponse] = await Promise.all([
        api.get('/contratos/estados'),
        api.get('/contratos/estatisticas')
      ]);

      setContratos(estadosResponse.data || {});
      
      // Garantir que estatisticas tenha valores padrão se vier vazio do backend
      const estatisticasData = estatisticasResponse.data || {};
      const estatisticasDefault: Estatisticas = {
        totalEstados: estatisticasData.totalEstados || 0,
        totalContratos: estatisticasData.totalContratos || 0,
        totalFuncionarios: estatisticasData.colaboradoresAtivos || 0,
        valorTotal: estatisticasData.valorTotalContratos || 0,
        distribucao: {
          ativo: estatisticasData.contratosAtivos || 0,
          proximo: estatisticasData.contratosProximoVencimento || 0,
          vencido: estatisticasData.contratosVencidos || 0,
          sem: 0
        }
      };
      
      setEstatisticas(estatisticasDefault);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(
        err.response?.data?.message || 
        'Erro ao conectar com o servidor. Verifique se a API está funcionando.'
      );
      
      // Em caso de erro, definir valores padrão
      setEstatisticas({
        totalEstados: 0,
        totalContratos: 0,
        totalFuncionarios: 0,
        valorTotal: 0,
        distribucao: { ativo: 0, proximo: 0, vencido: 0, sem: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarDetalhesEstado = async (siglaEstado: string, nomeEstado: string) => {
    try {
      setLoadingDetalhes(true);
      
      // Carregar dados reais do backend para o estado específico
      const response = await api.get(`/contratos/estado/${siglaEstado}`);
      
      if (response.data) {
        setEstadoSelecionado(response.data);
        setModalAberto(true);
      } else {
        // Se não há dados para o estado, mostrar estado vazio
        const estadoVazio: DetalhesEstado = {
          sigla: siglaEstado,
          nome: nomeEstado,
          status: 'sem',
          quantidadeContratos: 0,
          clientes: [],
          colaboradores: 0,
          valorTotal: 0
        };
        setEstadoSelecionado(estadoVazio);
        setModalAberto(true);
      }
    } catch (err: any) {
      console.error('Erro ao carregar detalhes do estado:', err);
      // Em caso de erro, mostrar estado vazio
      const estadoVazio: DetalhesEstado = {
        sigla: siglaEstado,
        nome: nomeEstado,
        status: 'sem',
        quantidadeContratos: 0,
        clientes: [],
        colaboradores: 0,
        valorTotal: 0
      };
      setEstadoSelecionado(estadoVazio);
      setModalAberto(true);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const handleClickEstado = (geo: any) => {
    const siglaEstado = geo.properties.sigla || geo.properties.SIGLA || geo.properties.UF;
    const nomeEstado = geo.properties.nome || geo.properties.NOME || geo.properties.NAME;
    
    if (siglaEstado) {
      carregarDetalhesEstado(siglaEstado, nomeEstado);
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEstadoSelecionado(null);
  };

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const getCorPorStatus = (sigla: string) => {
    const status = contratos[sigla];
    return cores[status] || cores.sem;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleAtualizar = () => {
    carregarDados();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Carregando mapa de atuação...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={handleAtualizar}>
              Tentar Novamente
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <MapIcon sx={{ fontSize: 32, color: 'primary.main', mr: 1 }} />
          <Typography variant="h4" component="h1">
            Mapa de Atuação
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            disabled
            sx={{ opacity: 0.5 }}
          >
            Filtros
          </Button>
          <Tooltip title={`Última atualização: ${lastUpdate.toLocaleTimeString()}`}>
            <IconButton onClick={handleAtualizar} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Estatísticas */}
      {estatisticas && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <BusinessIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Estados com Contratos
                    </Typography>
                    <Typography variant="h4">
                      {estatisticas?.totalEstados || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <BusinessIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total de Contratos
                    </Typography>
                    <Typography variant="h4">
                      {estatisticas?.totalContratos || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PeopleIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total de Funcionários
                    </Typography>
                    <Typography variant="h4">
                      {estatisticas?.totalFuncionarios?.toLocaleString() || '0'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <MoneyIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Valor Total Estimado
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(estatisticas?.valorTotal || 0)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Legenda */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Status dos Contratos
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={2}>
          {Object.entries(cores).map(([status, cor]) => (
            <Box key={status} display="flex" alignItems="center">
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  bgcolor: cor,
                  borderRadius: 1,
                  mr: 1,
                  border: '1px solid rgba(0,0,0,0.1)'
                }}
              />
              <Chip
                label={`${statusLabels[status as keyof typeof statusLabels]} (${estatisticas?.distribucao?.[status as keyof typeof statusLabels] || 0})`}
                size="small"
                variant="outlined"
              />
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Mapa */}
      <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
        <Box sx={{ width: '100%', height: 600, position: 'relative' }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ 
              scale: 750, 
              center: [-52, -15] 
            }}
            style={{ 
              width: '100%', 
              height: '100%'
            }}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo: any) => {
                  const sigla = geo.properties.sigla || 
                               geo.properties.UF || 
                               geo.properties.name?.slice(0, 2).toUpperCase() || 
                               '';
                  const status = contratos[sigla] || 'sem';
                  
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getCorPorStatus(sigla)}
                      stroke="#FFF"
                      strokeWidth={0.5}
                      style={{
                        default: { 
                          outline: 'none',
                          transition: 'all 0.2s ease-in-out'
                        },
                        hover: { 
                          fill: '#007bff', 
                          outline: 'none',
                          cursor: 'pointer',
                          strokeWidth: 1
                        },
                        pressed: { outline: 'none' },
                      }}
                      onClick={() => handleClickEstado(geo)}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </Box>
      </Paper>

      {/* Modal de Detalhes do Estado */}
      <Dialog open={modalAberto} onClose={fecharModal} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <LocationIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Box>
                <Typography variant="h5">
                  {estadoSelecionado?.nome} ({estadoSelecionado?.sigla})
                </Typography>
                <Chip 
                  label={statusLabels[estadoSelecionado?.status || 'sem']}
                  color={
                    estadoSelecionado?.status === 'ativo' ? 'success' :
                    estadoSelecionado?.status === 'proximo' ? 'warning' :
                    estadoSelecionado?.status === 'vencido' ? 'error' : 'default'
                  }
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>
            <IconButton onClick={fecharModal}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {loadingDetalhes ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Cards de Estatísticas */}
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <BusinessIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" color="primary">
                      {estadoSelecionado?.quantidadeContratos || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Contratos Ativos
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <PeopleIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="h4" color="info.main">
                      {estadoSelecionado?.colaboradores || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Colaboradores
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <MoneyIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h5" color="success.main">
                      {formatarMoeda(estadoSelecionado?.valorTotal || 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Valor Total
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <BusinessIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" color="warning.main">
                      {estadoSelecionado?.clientes?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Clientes Ativos
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Lista de Clientes */}
              {estadoSelecionado?.clientes && estadoSelecionado.clientes.length > 0 && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Clientes no Estado
                    </Typography>
                    <List dense>
                      {estadoSelecionado.clientes.map((cliente, index) => (
                        <React.Fragment key={index}>
                          <ListItem>
                            <BusinessIcon sx={{ mr: 2, color: 'primary.main' }} />
                            <ListItemText 
                              primary={cliente}
                              secondary={`Cliente ${index + 1} de ${estadoSelecionado.clientes.length}`}
                            />
                          </ListItem>
                          {index < estadoSelecionado.clientes.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              )}

              {/* Informações Adicionais */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Resumo Executivo
                  </Typography>
                  <Typography variant="body1" paragraph>
                    O estado de <strong>{estadoSelecionado?.nome}</strong> possui atualmente{' '}
                    <strong>{estadoSelecionado?.quantidadeContratos} contratos</strong> com status{' '}
                    <strong>{statusLabels[estadoSelecionado?.status || 'sem']}</strong>.
                  </Typography>
                  
                  {(estadoSelecionado?.quantidadeContratos || 0) > 0 && (
                    <Typography variant="body1" paragraph>
                      Nossa operação conta com <strong>{estadoSelecionado?.colaboradores} colaboradores</strong>{' '}
                      atendendo <strong>{estadoSelecionado?.clientes?.length} clientes</strong>, gerando um faturamento 
                      estimado de <strong>{formatarMoeda(estadoSelecionado?.valorTotal || 0)}</strong>.
                    </Typography>
                  )}
                  
                  {(estadoSelecionado?.quantidadeContratos || 0) === 0 && (
                    <Typography variant="body1" color="textSecondary">
                      Atualmente não possuímos contratos ativos neste estado. 
                      Esta pode ser uma oportunidade de expansão para novos negócios.
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={fecharModal} 
            variant="contained" 
            color="primary"
            startIcon={<CloseIcon />}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rodapé */}
      <Box mt={2} textAlign="center">
        <Typography variant="caption" color="textSecondary">
          Última atualização: {lastUpdate?.toLocaleString('pt-BR') || 'Não disponível'} | 
          Dados de {Object.keys(contratos).length} estados carregados
        </Typography>
      </Box>
    </Box>
  );
};

export default MapaDeAtuacaoReal; 