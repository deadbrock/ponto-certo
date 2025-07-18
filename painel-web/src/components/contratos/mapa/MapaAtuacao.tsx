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
  useMediaQuery
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
  Edit as EditIcon,
  Visibility as ViewIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import mapaService, { 
  EstadoContrato, 
  ContratoResumo, 
  DadosMapaAtuacao, 
  FiltrosMapa 
} from '../../../services/mapaService';
import MapaBrasilCompleto from './MapaBrasilCompleto';



// Componente principal
const MapaAtuacao: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { usuario } = useAuth();
  const { showToast } = useToast();

  // Debug logs
  console.log('🗺️ MapaAtuacao: Componente carregado');
  console.log('👤 Usuário atual:', usuario);
  console.log('🔒 Perfil do usuário:', usuario?.perfil);

  // Estados principais
  const [dadosMapa, setDadosMapa] = useState<DadosMapaAtuacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados da interface
  const [filtros, setFiltros] = useState<FiltrosMapa>({});
  const [showFiltros, setShowFiltros] = useState(false);
  const [estadoSelecionado, setEstadoSelecionado] = useState<EstadoContrato | null>(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [clientes, setClientes] = useState<string[]>([]);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  // Verificar permissões de acesso (temporariamente liberado para debug)
  const podeAcessar = true; // usuario?.perfil === 'Administrador' || usuario?.perfil === 'RH';
  
  console.log('✅ Pode acessar mapa:', podeAcessar);

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
  };

  // Limpar filtros
  const limparFiltros = () => {
    setFiltros({});
    setTimeout(() => carregarDados(), 100);
  };

  // Selecionar estado no mapa
  const selecionarEstado = async (uf: string) => {
    if (!dadosMapa) return;

    const estado = dadosMapa.estados.find(e => e.uf === uf);
    if (estado && estado.statusContrato !== 'sem-contratos') {
      try {
        // Buscar contratos detalhados do estado
        const contratos = await mapaService.buscarContratosPorEstado(uf);
        setEstadoSelecionado({
          ...estado,
          contratos
        });
        setShowDetalhes(true);
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
          🗺️ Mapa de Atuação
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Carregando dados do mapa...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          🗺️ Mapa de Atuação
        </Typography>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={carregarDados}>
            Tentar Novamente
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Cabeçalho */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            🗺️ Mapa de Atuação
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualização geográfica dos contratos por estado do Brasil
          </Typography>
        </Box>

        <Box display="flex" gap={2}>
          <Button
            startIcon={<FilterIcon />}
            variant="outlined"
            onClick={() => setShowFiltros(true)}
          >
            Filtros
          </Button>
          
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={carregarDados}
          >
            Atualizar
          </Button>
        </Box>
      </Box>

      {/* Cards de Resumo */}
      {dadosMapa && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Estados com Contratos
                    </Typography>
                    <Typography variant="h4" color="primary.main">
                      {dadosMapa.resumo.totalEstados}
                    </Typography>
                  </Box>
                  <LocationIcon color="primary" sx={{ fontSize: 40 }} />
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
                      Total de Contratos
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {dadosMapa.resumo.totalContratos}
                    </Typography>
                  </Box>
                  <BusinessIcon color="success" sx={{ fontSize: 40 }} />
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
                      Total de Funcionários
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      {dadosMapa.resumo.totalFuncionarios.toLocaleString('pt-BR')}
                    </Typography>
                  </Box>
                  <PeopleIcon color="info" sx={{ fontSize: 40 }} />
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
                      {dadosMapa.resumo.valorTotalContratos.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        notation: 'compact',
                        maximumFractionDigits: 1
                      })}
                    </Typography>
                  </Box>
                  <MoneyIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Mapa Melhorado */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Mapa Interativo do Brasil
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Clique e arraste para navegar • Use os controles para zoom • Passe o mouse sobre os estados para ver detalhes
          </Typography>
          
          {dadosMapa && (
            <MapaBrasilCompleto
              estados={dadosMapa.estados}
              onEstadoClick={selecionarEstado}
              onEstadoHover={setHoveredState}
              hoveredState={hoveredState}
            />
          )}
        </CardContent>
      </Card>

      {/* Drawer de Filtros */}
      <Drawer
        anchor="right"
        open={showFiltros}
        onClose={() => setShowFiltros(false)}
        PaperProps={{ sx: { width: isMobile ? '100%' : 400 } }}
      >
        <Box p={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Filtros do Mapa</Typography>
            <IconButton onClick={() => setShowFiltros(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box display="flex" flexDirection="column" gap={3}>
            {/* Filtro por Status */}
            <FormControl fullWidth>
              <InputLabel>Status dos Contratos</InputLabel>
              <Select
                multiple
                value={filtros.status || []}
                label="Status dos Contratos"
                onChange={(e) => setFiltros({
                  ...filtros,
                  status: e.target.value as string[]
                })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="vencido">Vencido</MenuItem>
                <MenuItem value="proximo-vencimento">Próximo do Vencimento</MenuItem>
              </Select>
            </FormControl>

            {/* Filtro por Cliente */}
            <FormControl fullWidth>
              <InputLabel>Cliente</InputLabel>
              <Select
                value={filtros.cliente || ''}
                label="Cliente"
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

            {/* Filtros de Período */}
            <TextField
              label="Vigência Início"
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
              label="Vigência Fim"
              type="date"
              fullWidth
              value={filtros.vigenciaFim || ''}
              onChange={(e) => setFiltros({
                ...filtros,
                vigenciaFim: e.target.value
              })}
              InputLabelProps={{ shrink: true }}
            />

            {/* Botões de Ação */}
            <Box display="flex" gap={2} mt={2}>
              <Button
                variant="contained"
                fullWidth
                onClick={aplicarFiltros}
              >
                Aplicar Filtros
              </Button>
              
              <Button
                variant="outlined"
                fullWidth
                onClick={limparFiltros}
                startIcon={<ClearIcon />}
              >
                Limpar
              </Button>
            </Box>
          </Box>
        </Box>
      </Drawer>

      {/* Drawer de Detalhes do Estado */}
      <Drawer
        anchor="right"
        open={showDetalhes}
        onClose={() => setShowDetalhes(false)}
        PaperProps={{ sx: { width: isMobile ? '100%' : 500 } }}
      >
        <Box p={3}>
          {estadoSelecionado && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Contratos - {estadoSelecionado.uf}
                </Typography>
                <IconButton onClick={() => setShowDetalhes(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* Resumo do Estado */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" color="primary.main">
                      {estadoSelecionado.totalContratos}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total de Contratos
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" color="info.main">
                      {estadoSelecionado.totalFuncionarios.toLocaleString('pt-BR')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total de Funcionários
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" color="success.main">
                      {estadoSelecionado.valorTotal.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Valor Total dos Contratos
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Lista de Contratos */}
              <Typography variant="h6" gutterBottom>
                Contratos no Estado
              </Typography>
              
              <List>
                {estadoSelecionado.contratos?.map((contrato, index) => (
                  <React.Fragment key={contrato.id}>
                    <ListItem>
                      <ListItemIcon>
                        <BusinessIcon color={
                          contrato.status === 'ativo' ? 'success' :
                          contrato.status === 'proximo-vencimento' ? 'warning' : 'error'
                        } />
                      </ListItemIcon>
                      <ListItemText
                        primary={contrato.nome}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {contrato.cliente} • {contrato.cidade}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {contrato.valor.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })} • {contrato.totalColaboradores} colaboradores
                            </Typography>
                            <Chip
                              label={contrato.status}
                              size="small"
                              color={
                                contrato.status === 'ativo' ? 'success' :
                                contrato.status === 'proximo-vencimento' ? 'warning' : 'error'
                              }
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        }
                      />
                      <Box display="flex" gap={1}>
                        <Tooltip title="Ver detalhes do contrato">
                          <IconButton size="small">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar quadro funcional">
                          <IconButton size="small">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItem>
                    {estadoSelecionado.contratos && index < estadoSelecionado.contratos.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default MapaAtuacao; 