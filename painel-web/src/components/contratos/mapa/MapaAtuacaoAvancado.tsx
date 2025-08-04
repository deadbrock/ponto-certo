import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  LocationOn as LocationIcon,
  Close as CloseIcon,
  TrendingUp,
  Assessment,
  Speed,
  DataUsage
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import mapaService, { 
  EstadoContrato, 
  ContratoResumo, 
  DadosMapaAtuacao, 
  FiltrosMapa 
} from '../../../services/mapaService';
import MapaBrasilAvancado from './MapaBrasilAvancado';

// Componente principal avançado
const MapaAtuacaoAvancado: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { usuario } = useAuth();
  const { showToast } = useToast();

  // Estados principais
  const [dadosMapa, setDadosMapa] = useState<DadosMapaAtuacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados da interface
  const [filtros, setFiltros] = useState<FiltrosMapa>({});
  const [showFiltros, setShowFiltros] = useState(false);
  const [clientes, setClientes] = useState<string[]>([]);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  // Verificar permissões de acesso (temporariamente liberado para debug)
  const podeAcessar = true;

  // Carregar dados iniciais
  useEffect(() => {
    if (!podeAcessar) {
      setError('Acesso negado. Apenas Administradores e RH podem acessar esta funcionalidade.');
      setLoading(false);
      return;
    }

    carregarDados();
    carregarClientes();
  }, [podeAcessar]);

  // Carregar dados do mapa
  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dados = await mapaService.buscarDadosMapaAtuacao(filtros);
      setDadosMapa(dados);
    } catch (error) {
      setError('Erro ao carregar dados do mapa');
      console.error('Erro ao carregar dados do mapa:', error);
      showToast('Erro ao carregar dados do mapa', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Carregar lista de clientes
  const carregarClientes = async () => {
    try {
      const clientesData = await mapaService.buscarClientes();
      setClientes(clientesData);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  // Aplicar filtros
  const aplicarFiltros = () => {
    carregarDados();
    setShowFiltros(false);
    showToast('Filtros aplicados com sucesso', 'success');
  };

  // Limpar filtros
  const limparFiltros = () => {
    setFiltros({});
    setTimeout(() => carregarDados(), 100);
    showToast('Filtros removidos', 'info');
  };

  // Selecionar estado no mapa
  const selecionarEstado = async (uf: string) => {
    if (!dadosMapa) return;

    const estado = dadosMapa.estados.find(e => e.uf === uf);
    if (estado && estado.statusContrato !== 'sem-contratos') {
      try {
        // Buscar contratos detalhados do estado seria feito aqui
        showToast(`Selecionado: ${estado.nomeEstado}`, 'info');
      } catch (error) {
        showToast('Erro ao carregar detalhes do estado', 'error');
      }
    }
  };

  if (!podeAcessar) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Acesso negado. Apenas usuários com perfil Administrador ou RH podem acessar o Mapa de Atuação.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          🗺️ Mapa de Atuação Avançado
        </Typography>
        <LinearProgress sx={{ borderRadius: 1, height: 6 }} />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Carregando dados do mapa avançado...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          🗺️ Mapa de Atuação Avançado
        </Typography>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={carregarDados}>
              Tentar Novamente
            </Button>
          }
          sx={{ borderRadius: 2 }}
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3} sx={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Cabeçalho Aprimorado */}
      <Fade in timeout={600}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h3" gutterBottom fontWeight="bold" color="primary.main">
              🗺️ Mapa de Atuação Avançado
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Visualização geográfica inteligente dos contratos por estado do Brasil
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Interativo • Responsivo • Dados em Tempo Real
            </Typography>
          </Box>

          <Box display="flex" gap={2}>
            <Tooltip title="Aplicar filtros avançados">
              <Button
                startIcon={<FilterIcon />}
                variant="outlined"
                onClick={() => setShowFiltros(true)}
                sx={{ 
                  borderRadius: 3,
                  px: 3,
                  '&:hover': { transform: 'translateY(-2px)' },
                  transition: 'all 0.2s ease'
                }}
              >
                Filtros
              </Button>
            </Tooltip>
            
            <Tooltip title="Atualizar dados">
              <Button
                startIcon={<RefreshIcon />}
                variant="contained"
                onClick={carregarDados}
                sx={{ 
                  borderRadius: 3,
                  px: 3,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  '&:hover': { 
                    background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                Atualizar
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </Fade>

      {/* Cards de Resumo Melhorados */}
      {dadosMapa && (
        <Zoom in timeout={800}>
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                color: 'white',
                borderRadius: 3,
                '&:hover': { transform: 'translateY(-4px)' },
                transition: 'all 0.3s ease'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                        Estados com Contratos
                      </Typography>
                      <Typography variant="h3" fontWeight="bold">
                        {dadosMapa.resumo.totalEstados}
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.8)">
                        de 27 estados
                      </Typography>
                    </Box>
                    <LocationIcon sx={{ fontSize: 50, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', 
                color: 'white',
                borderRadius: 3,
                '&:hover': { transform: 'translateY(-4px)' },
                transition: 'all 0.3s ease'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                        Total de Contratos
                      </Typography>
                      <Typography variant="h3" fontWeight="bold">
                        {dadosMapa.resumo.totalContratos}
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.8)">
                        ativos
                      </Typography>
                    </Box>
                    <BusinessIcon sx={{ fontSize: 50, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
                color: 'white',
                borderRadius: 3,
                '&:hover': { transform: 'translateY(-4px)' },
                transition: 'all 0.3s ease'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                        Total de Funcionários
                      </Typography>
                      <Typography variant="h3" fontWeight="bold">
                        {dadosMapa.resumo.totalFuncionarios.toLocaleString('pt-BR')}
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.8)">
                        colaboradores
                      </Typography>
                    </Box>
                    <PeopleIcon sx={{ fontSize: 50, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                color: 'white',
                borderRadius: 3,
                '&:hover': { transform: 'translateY(-4px)' },
                transition: 'all 0.3s ease'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                        Valor Total
                      </Typography>
                      <Typography variant="h3" fontWeight="bold">
                        {dadosMapa.resumo.valorTotalContratos.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          notation: 'compact',
                          maximumFractionDigits: 1
                        })}
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.8)">
                        faturamento
                      </Typography>
                    </Box>
                    <MoneyIcon sx={{ fontSize: 50, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Zoom>
      )}

      {/* Cards de Status Detalhados */}
      {dadosMapa && (
        <Fade in timeout={1000}>
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, border: '2px solid #4ade80' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <TrendingUp sx={{ color: '#4ade80', fontSize: 32 }} />
                    <Typography variant="h6" color="#059669">Contratos Ativos</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold" color="#059669">
                    {dadosMapa.resumo.estadosAtivos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    estados com contratos em operação
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, border: '2px solid #fbbf24' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Assessment sx={{ color: '#fbbf24', fontSize: 32 }} />
                    <Typography variant="h6" color="#d97706">Próximos ao Vencimento</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold" color="#d97706">
                    {dadosMapa.resumo.estadosProximoVencimento}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    estados com contratos vencendo
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, border: '2px solid #f87171' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Speed sx={{ color: '#f87171', fontSize: 32 }} />
                    <Typography variant="h6" color="#dc2626">Contratos Vencidos</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold" color="#dc2626">
                    {dadosMapa.resumo.estadosVencidos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    estados com contratos vencidos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>
      )}

      {/* Mapa Avançado */}
      <Fade in timeout={1200}>
        <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <DataUsage sx={{ color: 'primary.main', fontSize: 32 }} />
              <Box>
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Mapa Interativo do Brasil
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Navegue • Zoom • Clique nos estados • Exporte dados
                </Typography>
              </Box>
            </Box>
            
            {dadosMapa && (
              <MapaBrasilAvancado
                estados={dadosMapa.estados}
                onEstadoClick={selecionarEstado}
                onEstadoHover={setHoveredState}
                hoveredState={hoveredState}
              />
            )}
          </CardContent>
        </Card>
      </Fade>

      {/* Drawer de Filtros Avançados */}
      <Drawer
        anchor="right"
        open={showFiltros}
        onClose={() => setShowFiltros(false)}
        PaperProps={{ sx: { width: isMobile ? '100%' : 450, backgroundColor: '#f8fafc' } }}
      >
        <Box p={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Typography variant="h5" fontWeight="bold">Filtros Avançados</Typography>
            <IconButton 
              onClick={() => setShowFiltros(false)}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.8)',
                '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Box display="flex" flexDirection="column" gap={3}>
            {/* Filtro por Status */}
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" gutterBottom>Status dos Contratos</Typography>
              <FormControl fullWidth>
                <InputLabel>Selecione os status</InputLabel>
                <Select
                  multiple
                  value={filtros.status || []}
                  label="Selecione os status"
                  onChange={(e) => setFiltros({
                    ...filtros,
                    status: e.target.value as string[]
                  })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip 
                          key={value} 
                          label={value} 
                          size="small" 
                          color={
                            value === 'ativo' ? 'success' :
                            value === 'proximo-vencimento' ? 'warning' : 'error'
                          }
                        />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="vencido">Vencido</MenuItem>
                  <MenuItem value="proximo-vencimento">Próximo do Vencimento</MenuItem>
                </Select>
              </FormControl>
            </Paper>

            {/* Filtro por Cliente */}
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" gutterBottom>Cliente</Typography>
              <FormControl fullWidth>
                <InputLabel>Selecione o cliente</InputLabel>
                <Select
                  value={filtros.cliente || ''}
                  label="Selecione o cliente"
                  onChange={(e) => setFiltros({
                    ...filtros,
                    cliente: e.target.value
                  })}
                >
                  <MenuItem value="">Todos os Clientes</MenuItem>
                  {clientes.map((cliente) => (
                    <MenuItem key={cliente} value={cliente}>
                      {cliente}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            {/* Filtros de Período */}
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" gutterBottom>Período de Vigência</Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  label="Data de Início"
                  type="date"
                  fullWidth
                  value={filtros.vigenciaInicio || ''}
                  onChange={(e) => setFiltros({
                    ...filtros,
                    vigenciaInicio: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="Data de Fim"
                  type="date"
                  fullWidth
                  value={filtros.vigenciaFim || ''}
                  onChange={(e) => setFiltros({
                    ...filtros,
                    vigenciaFim: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Paper>

            {/* Botões de Ação */}
            <Box display="flex" gap={2} mt={3}>
              <Button
                variant="contained"
                fullWidth
                onClick={aplicarFiltros}
                sx={{ 
                  borderRadius: 2,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                }}
              >
                Aplicar Filtros
              </Button>
              
              <Button
                variant="outlined"
                fullWidth
                onClick={limparFiltros}
                startIcon={<ClearIcon />}
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                Limpar
              </Button>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default MapaAtuacaoAvancado;