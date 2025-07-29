import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Tooltip,
  Badge,
  Fab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  FileCopy as CloneIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  ViewModule as CardViewIcon,
  ViewList as TableViewIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  Contrato,
  FiltrosContrato,
  DashboardContratos,
  AlertaVigencia
} from '../types/contratos';
import AlertasVigencia from '../components/contratos/AlertasVigencia';
// import ClonagemContrato from '../components/contratos/ClonagemContrato'; // REMOVIDO PARA DEPLOY
import CriacaoContrato from '../components/contratos/CriacaoContrato';
import { ContratosExportService } from '../services/contratosExportService';

const ContratosPage: React.FC = () => {
  const { usuario } = useAuth();
  const { showToast } = useToast();

  // Estados principais
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [dashboard, setDashboard] = useState<DashboardContratos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de UI
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contrato | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [contratoParaClonar, setContratoParaClonar] = useState<Contrato | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Estados de filtros
  const [filtros, setFiltros] = useState<FiltrosContrato>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Função para carregar dados do dashboard
  const carregarDashboard = async () => {
    try {
      const response = await fetch('/api/contratos/dashboard');
      if (response.ok) {
        const data = await response.json();
        // Garantir que dashboard tenha valores padrão se não vieram do backend
        setDashboard({
          totalContratos: data?.totalContratos || 0,
          contratosAtivos: data?.contratosAtivos || 0,
          contratosVencidos: data?.contratosVencidos || 0,
          contratosProximoVencimento: data?.contratosProximoVencimento || 0,
          valorTotalContratos: data?.valorTotalContratos || 0,
          alertasVigencia: Array.isArray(data?.alertasVigencia) ? data.alertasVigencia : [],
          ...data
        });
      } else {
        throw new Error('Erro ao carregar dashboard');
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    }
  };

  // Função para carregar contratos
  const carregarContratos = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filtros.status) params.append('status', filtros.status);
      if (filtros.cliente) params.append('cliente', filtros.cliente);
      if (filtros.localizacao) params.append('localizacao', filtros.localizacao);
      if (searchTerm) params.append('busca', searchTerm);

      const response = await fetch(`/api/contratos?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // Garantir que sempre seja um array, mesmo se a API retornar algo diferente
        setContratos(Array.isArray(data) ? data : []);
      } else {
        throw new Error('Erro ao carregar contratos');
      }
    } catch (error) {
      setError('Erro de conexão com o servidor');
      console.error('Erro ao carregar contratos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    carregarContratos();
    carregarDashboard();
  }, [filtros, searchTerm]);

  // Garantir que contratos seja sempre um array e tenha propriedades válidas
  const contratosSeguro = Array.isArray(contratos) ? contratos.map(contrato => ({
    id: contrato.id || `temp-${Date.now()}`,
    nome: contrato.nome || 'Contrato sem nome',
    cliente: contrato.cliente || 'Cliente não informado',
    localizacao: contrato.localizacao || 'Localização não informada',
    valor: typeof contrato.valor === 'number' ? contrato.valor : 0,
    vigenciaInicio: contrato.vigenciaInicio || new Date(),
    vigenciaFim: contrato.vigenciaFim || new Date(),
    status: contrato.status || 'Ativo',
    colaboradores: Array.isArray(contrato.colaboradores) ? contrato.colaboradores : [],
    documentos: Array.isArray(contrato.documentos) ? contrato.documentos : [],
    historicoAlteracoes: Array.isArray(contrato.historicoAlteracoes) ? contrato.historicoAlteracoes : [],
    criadoEm: contrato.criadoEm || new Date(),
    atualizadoEm: contrato.atualizadoEm || new Date()
  })) : [];

  // Função para determinar status baseado na vigência
  const getStatusContrato = (vigenciaFim: Date | string | undefined): 'Ativo' | 'Vencido' | 'Próximo do vencimento' => {
    if (!vigenciaFim) return 'Ativo';
    
    const hoje = new Date();
    const dataFim = typeof vigenciaFim === 'string' ? new Date(vigenciaFim) : vigenciaFim;
    const diasRestantes = differenceInDays(dataFim, hoje);

    if (diasRestantes < 0) return 'Vencido';
    if (diasRestantes <= 30) return 'Próximo do vencimento';
    return 'Ativo';
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'success';
      case 'Vencido':
        return 'error';
      case 'Próximo do vencimento':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Função para calcular progresso da vigência
  const calcularProgressoVigencia = (inicio: Date | string | undefined, fim: Date | string | undefined): number => {
    if (!inicio || !fim) return 0;
    
    const hoje = new Date();
    const dataInicio = typeof inicio === 'string' ? new Date(inicio) : inicio;
    const dataFim = typeof fim === 'string' ? new Date(fim) : fim;
    
    const totalDias = differenceInDays(dataFim, dataInicio);
    const diasPassados = differenceInDays(hoje, dataInicio);
    
    if (totalDias <= 0) return 100;
    return Math.min(Math.max((diasPassados / totalDias) * 100, 0), 100);
  };

  // Função para criar novo contrato
  const criarContrato = async (dadosContrato: any) => {
    try {
      const response = await fetch('/api/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosContrato)
      });

      if (response.ok) {
        const result = await response.json();
        showToast('Contrato criado com sucesso!', 'success');
        carregarContratos();
        carregarDashboard();
        setShowCreateDialog(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar contrato');
      }
    } catch (error: any) {
      showToast(error.message || 'Erro ao criar contrato', 'error');
      console.error('Erro ao criar contrato:', error);
      throw error; // Re-throw para o componente tratar
    }
  };

  // Função para clonar contrato
  const clonarContrato = async (dadosClonagem: any) => {
    try {
      const response = await fetch('/api/contratos/clonar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosClonagem)
      });

      if (response.ok) {
        showToast('Contrato clonado com sucesso!', 'success');
        carregarContratos();
        setShowCloneDialog(false);
        setContratoParaClonar(null);
      } else {
        throw new Error('Erro ao clonar contrato');
      }
    } catch (error) {
      showToast('Erro ao clonar contrato', 'error');
      console.error('Erro ao clonar contrato:', error);
    }
  };

  // Função para marcar alerta como visualizado
  const marcarAlertaVisualizado = async (alertaId: string) => {
    try {
      const response = await fetch(`/api/contratos/alertas/${alertaId}/visualizar`, {
        method: 'PATCH'
      });

      if (response.ok) {
        carregarDashboard();
      }
    } catch (error) {
      console.error('Erro ao marcar alerta como visualizado:', error);
    }
  };

  // Função para navegar para detalhes do contrato
  const verContrato = (contratoId: string) => {
    // Implementar navegação
    showToast('Navegação para detalhes em desenvolvimento', 'info');
  };

  // Função para exportar dados
  const exportarDados = async () => {
    try {
      await ContratosExportService.exportarListagemContratos(contratosSeguro);
      showToast('Relatório exportado com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao exportar relatório', 'error');
      console.error('Erro ao exportar:', error);
    }
  };

  // Verificar permissões de acesso
  const podeEditar = usuario?.perfil === 'administrador' || usuario?.perfil === 'Administrador' || usuario?.perfil === 'RH';
  const podeAdicionar = usuario?.perfil === 'administrador' || usuario?.perfil === 'Administrador' || usuario?.perfil === 'RH';

  // Renderizar cards dos contratos
  const renderContractCards = () => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedContratos = contratosSeguro.slice(startIndex, endIndex);

    return (
      <Grid container spacing={3}>
        {paginatedContratos.map((contrato) => {
          const vigenciaFim = contrato.vigenciaFim ? new Date(contrato.vigenciaFim) : new Date();
          const vigenciaInicio = contrato.vigenciaInicio ? new Date(contrato.vigenciaInicio) : new Date();
          const diasRestantes = differenceInDays(vigenciaFim, new Date());
          const progresso = calcularProgressoVigencia(vigenciaInicio, vigenciaFim);

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={contrato.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
                }}
              >
                {/* Badge de Status */}
                <Chip
                  label={contrato.status || getStatusContrato(contrato.vigenciaFim)}
                  color={getStatusColor(contrato.status || getStatusContrato(contrato.vigenciaFim)) as any}
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                />

                <CardContent sx={{ flexGrow: 1, pt: 5 }}>
                  <Typography variant="h6" gutterBottom noWrap title={contrato.nome || 'Sem nome'}>
                    {contrato.nome || 'Contrato sem nome'}
                  </Typography>

                  <Box display="flex" alignItems="center" mb={1}>
                    <PersonIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {contrato.cliente || 'Cliente não informado'}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" mb={1}>
                    <LocationIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {contrato.localizacao || 'Localização não informada'}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" mb={2}>
                    <MoneyIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {(contrato.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </Typography>
                  </Box>

                  {/* Progresso da Vigência */}
                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="caption" color="text.secondary">
                        Vigência
                      </Typography>
                      <Typography variant="caption" color={diasRestantes < 30 ? 'warning.main' : 'text.secondary'}>
                        {diasRestantes > 0 ? `${diasRestantes} dias` : 'Vencido'}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={progresso}
                      color={diasRestantes < 30 ? 'warning' : 'primary'}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                      {format(vigenciaInicio, 'dd/MM/yy')} - {format(vigenciaFim, 'dd/MM/yy')}
                    </Typography>
                  </Box>

                  {/* Colaboradores */}
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      {(contrato.colaboradores || []).length} colaboradores
                    </Typography>
                    {(contrato.status === 'Próximo do vencimento' || getStatusContrato(contrato.vigenciaFim) === 'Próximo do vencimento') && (
                      <Tooltip title="Próximo do vencimento">
                        <WarningIcon color="warning" fontSize="small" />
                      </Tooltip>
                    )}
                  </Box>
                </CardContent>

                {/* Ações */}
                <Box p={2} pt={0}>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => {
                        setSelectedContract(contrato);
                        setShowDetails(true);
                      }}
                      fullWidth
                    >
                      Ver
                    </Button>
                    {podeEditar && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          // Navegação para edição
                          showToast('Funcionalidade de edição em desenvolvimento', 'info');
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    {podeAdicionar && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setContratoParaClonar(contrato);
                          setShowCloneDialog(true);
                        }}
                      >
                        <CloneIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  // Renderizar tabela dos contratos
  const renderContractTable = () => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedContratos = contratosSeguro.slice(startIndex, endIndex);

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Localização</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell>Vigência</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Colaboradores</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedContratos.map((contrato) => {
              const vigenciaFim = contrato.vigenciaFim ? new Date(contrato.vigenciaFim) : new Date();
              const vigenciaInicio = contrato.vigenciaInicio ? new Date(contrato.vigenciaInicio) : new Date();
              const diasRestantes = differenceInDays(vigenciaFim, new Date());
              
              return (
                <TableRow key={contrato.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {contrato.nome || 'Contrato sem nome'}
                    </Typography>
                  </TableCell>
                  <TableCell>{contrato.cliente || 'Cliente não informado'}</TableCell>
                  <TableCell>{contrato.localizacao || 'Localização não informada'}</TableCell>
                  <TableCell align="right">
                    {(contrato.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(vigenciaInicio, 'dd/MM/yyyy')} - {format(vigenciaFim, 'dd/MM/yyyy')}
                    </Typography>
                    <Typography variant="caption" color={diasRestantes < 30 ? 'warning.main' : 'text.secondary'}>
                      {diasRestantes > 0 ? `${diasRestantes} dias restantes` : 'Vencido'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={contrato.status || getStatusContrato(contrato.vigenciaFim)}
                      color={getStatusColor(contrato.status || getStatusContrato(contrato.vigenciaFim)) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Badge badgeContent={(contrato.colaboradores || []).length} color="primary">
                      <PersonIcon color="action" />
                    </Badge>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={0.5} justifyContent="center">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedContract(contrato);
                          setShowDetails(true);
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                      {podeEditar && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            showToast('Funcionalidade de edição em desenvolvimento', 'info');
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {podeAdicionar && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            setContratoParaClonar(contrato);
                            setShowCloneDialog(true);
                          }}
                        >
                          <CloneIcon />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>Contratos</Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Carregando contratos...
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Cabeçalho */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Contratos
          </Typography>
          {dashboard && (
            <Typography variant="body2" color="text.secondary">
              {dashboard.totalContratos || 0} contratos • {dashboard.contratosAtivos || 0} ativos • {dashboard.contratosVencidos || 0} vencidos
            </Typography>
          )}
        </Box>

        <Box display="flex" gap={2} alignItems="center">
          {/* Toggle de visualização */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="cards">
              <CardViewIcon />
            </ToggleButton>
            <ToggleButton value="table">
              <TableViewIcon />
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Botões de ação */}
          <Button
            startIcon={<ExportIcon />}
            onClick={exportarDados}
            variant="outlined"
            size="small"
          >
            Exportar
          </Button>

          <Button
            startIcon={<RefreshIcon />}
            onClick={() => carregarContratos()}
            variant="outlined"
            size="small"
          >
            Atualizar
          </Button>

          {podeAdicionar && (
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setShowCreateDialog(true)}
            >
              Novo Contrato
            </Button>
          )}
        </Box>
      </Box>

      {/* Dashboard Cards */}
      {dashboard && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total de Contratos
                    </Typography>
                    <Typography variant="h4">
                      {dashboard.totalContratos || 0}
                    </Typography>
                  </Box>
                  <CheckIcon color="primary" fontSize="large" />
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
                      {dashboard.contratosAtivos || 0}
                    </Typography>
                  </Box>
                  <CheckIcon color="success" fontSize="large" />
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
                      Próximos do Vencimento
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {dashboard.contratosProximoVencimento || 0}
                    </Typography>
                  </Box>
                  <WarningIcon color="warning" fontSize="large" />
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
                    <Typography variant="h4">
                      {(dashboard.valorTotalContratos || 0).toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL',
                        notation: 'compact',
                        maximumFractionDigits: 1
                      })}
                    </Typography>
                  </Box>
                  <MoneyIcon color="primary" fontSize="large" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtros e Busca */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <TextField
              placeholder="Buscar contratos..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filtros.status || ''}
                label="Status"
                onChange={(e) => setFiltros({ ...filtros, status: e.target.value || undefined })}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="Ativo">Ativo</MenuItem>
                <MenuItem value="Vencido">Vencido</MenuItem>
                <MenuItem value="Próximo do vencimento">Próximo do vencimento</MenuItem>
              </Select>
            </FormControl>

            <TextField
              placeholder="Cliente"
              variant="outlined"
              size="small"
              value={filtros.cliente || ''}
              onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value || undefined })}
              sx={{ minWidth: 150 }}
            />

            <TextField
              placeholder="Localização"
              variant="outlined"
              size="small"
              value={filtros.localizacao || ''}
              onChange={(e) => setFiltros({ ...filtros, localizacao: e.target.value || undefined })}
              sx={{ minWidth: 150 }}
            />

            <Button
              variant="outlined"
              onClick={() => {
                setFiltros({});
                setSearchTerm('');
              }}
            >
              Limpar Filtros
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Alertas de Vigência */}
      {dashboard?.alertasVigencia && Array.isArray(dashboard.alertasVigencia) && dashboard.alertasVigencia.length > 0 && (
        <Box mb={3}>
          <AlertasVigencia
            alertas={dashboard.alertasVigencia}
            onVerContrato={verContrato}
            onMarcarVisualizado={marcarAlertaVisualizado}
            compact={true}
          />
        </Box>
      )}

      {/* Lista de Contratos */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {contratosSeguro.length === 0 && !loading && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum contrato encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {searchTerm || Object.keys(filtros).length > 0 
                ? 'Tente ajustar os filtros de busca'
                : 'Comece criando seu primeiro contrato'
              }
            </Typography>
            {podeAdicionar && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowCreateDialog(true)}
              >
                Criar Primeiro Contrato
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {contratosSeguro.length > 0 && (
        <>
          {/* Renderização baseada no modo de visualização */}
          {viewMode === 'cards' ? renderContractCards() : renderContractTable()}

          {/* Paginação */}
          <Box display="flex" justifyContent="center" mt={3}>
            <TablePagination
              component="div"
              count={contratosSeguro.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[12, 24, 48]}
              labelRowsPerPage="Contratos por página:"
              labelDisplayedRows={({ from, to, count }) => 
                `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`
              }
            />
          </Box>
        </>
      )}

      {/* FAB para adicionar contrato */}
      {podeAdicionar && (
        <Fab
          color="primary"
          aria-label="adicionar contrato"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setShowCreateDialog(true)}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Dialog de Criação */}
      <CriacaoContrato
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCriar={criarContrato}
      />

      {/* Dialog de Clonagem */}
      {/* <ClonagemContrato
        open={showCloneDialog}
        contrato={contratoParaClonar}
        onClose={() => {
          setShowCloneDialog(false);
          setContratoParaClonar(null);
        }}
        onClonar={clonarContrato}
      /> */} {/* REMOVIDO TEMPORARIAMENTE PARA DEPLOY */}

      {/* Dialog de Detalhes (placeholder) */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Detalhes do Contrato
          <IconButton
            aria-label="close"
            onClick={() => setShowDetails(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            ✕
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedContract && (
            <Typography variant="body2">
              Detalhes completos do contrato "{selectedContract.nome}" serão implementados 
              na próxima etapa com abas para dados gerais, colaboradores, documentos e histórico.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ContratosPage; 