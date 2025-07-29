import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Tooltip,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Switch,
  FormControlLabel,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Description as DocumentIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Business as BusinessIcon,
  Assessment as ReportIcon,
  GetApp as ExportIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import {
  Contrato,
  Colaborador,
  DocumentoContrato,
  AlteracaoContrato,
  KPIsContrato
} from '../types/contratos';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`contrato-tabpanel-${index}`}
      aria-labelledby={`contrato-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ContratoDetalhesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { showToast } = useToast();

  // Estados principais
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [kpis, setKpis] = useState<KPIsContrato | null>(null);
  const [colaboradoresDisponiveis, setColaboradoresDisponiveis] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estados da UI
  const [tabValue, setTabValue] = useState(0);
  const [showAddColaborador, setShowAddColaborador] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [selectedColaboradores, setSelectedColaboradores] = useState<Colaborador[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docTipo, setDocTipo] = useState<'Contrato' | 'Aditivo' | 'Memorando' | 'Outro'>('Contrato');
  const [docNome, setDocNome] = useState('');

  // Estados de edição
  const [editData, setEditData] = useState<Partial<Contrato>>({});

  // Verificar permissões
  const podeEditar = usuario?.perfil === 'Administrador' || usuario?.perfil === 'RH';
  const podeVerDetalhes = true; // Todos podem ver detalhes básicos

  // Carregar dados do contrato
  const carregarContrato = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Carregar contrato
      const contratoResponse = await api.get(`/contratos/${id}`);
      setContrato(contratoResponse.data);
      setEditData(contratoResponse.data);

      // Carregar KPIs
      try {
        const kpisResponse = await api.get(`/contratos/${id}/kpis`);
        setKpis(kpisResponse.data);
      } catch (kpisError) {
        console.warn('Erro ao carregar KPIs:', kpisError);
      }

      // Carregar colaboradores disponíveis
      try {
        const colaboradoresResponse = await api.get('/colaboradores/disponiveis');
        setColaboradoresDisponiveis(colaboradoresResponse.data || []);
      } catch (colaboradoresError) {
        console.warn('Erro ao carregar colaboradores:', colaboradoresError);
      }

    } catch (error) {
      setError('Erro ao carregar dados do contrato');
      console.error('Erro ao carregar contrato:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarContrato();
  }, [id]);

  // Função para salvar alterações
  const salvarAlteracoes = async () => {
    if (!contrato || !id) return;

    try {
      await api.put(`/contratos/${id}`, editData);
      showToast('Contrato atualizado com sucesso!', 'success');
      setIsEditing(false);
      carregarContrato();
    } catch (error) {
      showToast('Erro ao salvar alterações', 'error');
      console.error('Erro ao salvar contrato:', error);
    }
  };

  // Função para adicionar colaboradores
  const adicionarColaboradores = async () => {
    if (!contrato || selectedColaboradores.length === 0) return;

    try {
      await api.post(`/contratos/${contrato.id}/colaboradores`, { 
        colaboradorIds: selectedColaboradores.map(c => c.id) 
      });

      showToast(`${selectedColaboradores.length} colaborador(es) adicionado(s)!`, 'success');
      setShowAddColaborador(false);
      setSelectedColaboradores([]);
      carregarContrato();
    } catch (error) {
      showToast('Erro ao adicionar colaboradores', 'error');
      console.error('Erro ao adicionar colaboradores:', error);
    }
  };

  // Função para remover colaborador
  const removerColaborador = async (colaboradorId: string) => {
    if (!contrato) return;

    try {
      await api.delete(`/contratos/${contrato.id}/colaboradores/${colaboradorId}`);
      showToast('Colaborador removido do contrato!', 'success');
      carregarContrato();
    } catch (error) {
      showToast('Erro ao remover colaborador', 'error');
      console.error('Erro ao remover colaborador:', error);
    }
  };

  // Função para upload de documento
  const uploadDocumento = async () => {
    if (!contrato || !uploadFile || !docNome) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('tipo', docTipo);
    formData.append('nome', docNome);

    try {
      await api.post(`/contratos/${contrato.id}/documentos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast('Documento enviado com sucesso!', 'success');
      setShowUploadDoc(false);
      setUploadFile(null);
      setDocNome('');
      carregarContrato();
    } catch (error) {
      showToast('Erro ao enviar documento', 'error');
      console.error('Erro ao upload documento:', error);
    }
  };

  // Função para exportar relatório
  const exportarRelatorio = async () => {
    if (!contrato) return;

    try {
      const response = await api.get(`/contratos/${contrato.id}/relatorio`, {
        responseType: 'blob',
        headers: { 'Accept': 'application/pdf' }
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_${contrato.nome.replace(/\s+/g, '_')}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast('Relatório gerado com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao gerar relatório', 'error');
      console.error('Erro ao gerar relatório:', error);
    }
  };

  // Calcular progresso da vigência
  const calcularProgressoVigencia = () => {
    if (!contrato) return 0;
    const hoje = new Date();
    const inicio = new Date(contrato.vigenciaInicio);
    const fim = new Date(contrato.vigenciaFim);
    const totalDias = differenceInDays(fim, inicio);
    const diasPassados = differenceInDays(hoje, inicio);
    return Math.min(Math.max((diasPassados / totalDias) * 100, 0), 100);
  };

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'success';
      case 'Vencido': return 'error';
      case 'Próximo do vencimento': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box p={3}>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Carregando detalhes do contrato...
        </Typography>
      </Box>
    );
  }

  if (error || !contrato) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {error || 'Contrato não encontrado'}
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/contratos')}
          sx={{ mt: 2 }}
        >
          Voltar para Contratos
        </Button>
      </Box>
    );
  }

  const diasRestantes = differenceInDays(new Date(contrato.vigenciaFim), new Date());
  const progressoVigencia = calcularProgressoVigencia();

  return (
    <Box p={3}>
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/contratos')}
          sx={{ textDecoration: 'none' }}
        >
          Contratos
        </Link>
        <Typography variant="body2" color="text.primary">
          {contrato.nome}
        </Typography>
      </Breadcrumbs>

      {/* Cabeçalho */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <Typography variant="h4">
              {contrato.nome}
            </Typography>
            <Chip
              label={contrato.status}
              color={getStatusColor(contrato.status) as any}
              size="small"
            />
          </Box>
          <Typography variant="body1" color="text.secondary" mb={1}>
            {contrato.cliente} • {contrato.localizacao}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {contrato.numeroContrato && `Contrato: ${contrato.numeroContrato} • `}
            Vigência: {format(new Date(contrato.vigenciaInicio), 'dd/MM/yyyy')} - {format(new Date(contrato.vigenciaFim), 'dd/MM/yyyy')}
          </Typography>
        </Box>

        <Box display="flex" gap={2}>
          <Button
            startIcon={<ReportIcon />}
            onClick={exportarRelatorio}
            variant="outlined"
          >
            Relatório
          </Button>

          {podeEditar && (
            <>
              {isEditing ? (
                <>
                  <Button
                    startIcon={<CancelIcon />}
                    onClick={() => {
                      setIsEditing(false);
                      setEditData(contrato);
                    }}
                    variant="outlined"
                  >
                    Cancelar
                  </Button>
                  <Button
                    startIcon={<SaveIcon />}
                    onClick={salvarAlteracoes}
                    variant="contained"
                  >
                    Salvar
                  </Button>
                </>
              ) : (
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => setIsEditing(true)}
                  variant="contained"
                >
                  Editar
                </Button>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* KPIs */}
      {kpis && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Colaboradores
                    </Typography>
                    <Typography variant="h4">
                      {kpis.totalColaboradores}
                    </Typography>
                  </Box>
                  <PersonIcon color="primary" fontSize="large" />
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
                      Presença
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {kpis.percentualPresenca.toFixed(1)}%
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
                      Dias Restantes
                    </Typography>
                    <Typography variant="h4" color={diasRestantes < 30 ? 'warning.main' : 'primary.main'}>
                      {Math.max(diasRestantes, 0)}
                    </Typography>
                  </Box>
                  <CalendarIcon color={diasRestantes < 30 ? 'warning' : 'primary'} fontSize="large" />
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
                      Valor Mensal
                    </Typography>
                    <Typography variant="h4">
                      {kpis.valorMensal.toLocaleString('pt-BR', { 
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

      {/* Progresso da Vigência */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Progresso da Vigência</Typography>
            <Typography variant="body2" color={diasRestantes < 30 ? 'warning.main' : 'text.secondary'}>
              {diasRestantes > 0 ? `${diasRestantes} dias restantes` : 'Contrato vencido'}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progressoVigencia}
            color={diasRestantes < 30 ? 'warning' : 'primary'}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="caption" color="text.secondary">
              Início: {format(new Date(contrato.vigenciaInicio), 'dd/MM/yyyy')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Fim: {format(new Date(contrato.vigenciaFim), 'dd/MM/yyyy')}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Dados Gerais" />
            <Tab label={`Colaboradores (${contrato.colaboradores.length})`} />
            <Tab label={`Documentos (${contrato.documentos.length})`} />
            <Tab label="Histórico" />
          </Tabs>
        </Box>

        {/* Aba 1: Dados Gerais */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nome do Contrato"
                fullWidth
                value={isEditing ? editData.nome || '' : contrato.nome}
                onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
                disabled={!isEditing}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Cliente"
                fullWidth
                value={isEditing ? editData.cliente || '' : contrato.cliente}
                onChange={(e) => setEditData({ ...editData, cliente: e.target.value })}
                disabled={!isEditing}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Localização"
                fullWidth
                value={isEditing ? editData.localizacao || '' : contrato.localizacao}
                onChange={(e) => setEditData({ ...editData, localizacao: e.target.value })}
                disabled={!isEditing}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Valor do Contrato"
                fullWidth
                type="number"
                value={isEditing ? editData.valor || 0 : contrato.valor}
                onChange={(e) => setEditData({ ...editData, valor: parseFloat(e.target.value) || 0 })}
                disabled={!isEditing}
                margin="normal"
                InputProps={{
                  startAdornment: 'R$ '
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Data de Início"
                fullWidth
                type="date"
                value={isEditing ? 
                  editData.vigenciaInicio ? format(new Date(editData.vigenciaInicio), 'yyyy-MM-dd') : '' :
                  format(new Date(contrato.vigenciaInicio), 'yyyy-MM-dd')
                }
                onChange={(e) => setEditData({ ...editData, vigenciaInicio: new Date(e.target.value) })}
                disabled={!isEditing}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Data de Fim"
                fullWidth
                type="date"
                value={isEditing ? 
                  editData.vigenciaFim ? format(new Date(editData.vigenciaFim), 'yyyy-MM-dd') : '' :
                  format(new Date(contrato.vigenciaFim), 'yyyy-MM-dd')
                }
                onChange={(e) => setEditData({ ...editData, vigenciaFim: new Date(e.target.value) })}
                disabled={!isEditing}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Responsável"
                fullWidth
                value={isEditing ? editData.responsavel || '' : contrato.responsavel || ''}
                onChange={(e) => setEditData({ ...editData, responsavel: e.target.value })}
                disabled={!isEditing}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Número do Contrato"
                fullWidth
                value={isEditing ? editData.numeroContrato || '' : contrato.numeroContrato || ''}
                onChange={(e) => setEditData({ ...editData, numeroContrato: e.target.value })}
                disabled={!isEditing}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Descrição/Objeto"
                fullWidth
                multiline
                rows={4}
                value={isEditing ? editData.descricao || '' : contrato.descricao || ''}
                onChange={(e) => setEditData({ ...editData, descricao: e.target.value })}
                disabled={!isEditing}
                margin="normal"
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Aba 2: Colaboradores */}
        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Quadro Funcional ({contrato.colaboradores.length} colaboradores)
            </Typography>
            {podeEditar && (
              <Button
                startIcon={<PersonAddIcon />}
                variant="contained"
                onClick={() => setShowAddColaborador(true)}
              >
                Adicionar Colaborador
              </Button>
            )}
          </Box>

          {contrato.colaboradores.length === 0 ? (
            <Alert severity="info">
              Nenhum colaborador vinculado a este contrato.
            </Alert>
          ) : (
            <List>
              {contrato.colaboradores.map((colaborador, index) => (
                <React.Fragment key={colaborador.id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={colaborador.nome}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {colaborador.cargo}
                          </Typography>
                          <Chip
                            label={colaborador.status}
                            size="small"
                            color={colaborador.status === 'Ativo' ? 'success' : 'default'}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      }
                    />
                    {podeEditar && (
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => removerColaborador(colaborador.id)}
                          color="error"
                        >
                          <PersonRemoveIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                  {index < contrato.colaboradores.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Aba 3: Documentos */}
        <TabPanel value={tabValue} index={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Documentos ({contrato.documentos.length})
            </Typography>
            {podeEditar && (
              <Button
                startIcon={<UploadIcon />}
                variant="contained"
                onClick={() => setShowUploadDoc(true)}
              >
                Upload Documento
              </Button>
            )}
          </Box>

          {contrato.documentos.length === 0 ? (
            <Alert severity="info">
              Nenhum documento anexado a este contrato.
            </Alert>
          ) : (
            <List>
              {contrato.documentos.map((documento, index) => (
                <React.Fragment key={documento.id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        <DocumentIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={documento.nome}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {documento.tipo} • {format(new Date(documento.criadoEm), 'dd/MM/yyyy HH:mm')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Por: {documento.criadoPor}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={1}>
                        <IconButton
                          edge="end"
                          onClick={() => window.open(documento.url, '_blank')}
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = documento.url;
                            link.download = documento.nome;
                            link.click();
                          }}
                        >
                          <DownloadIcon />
                        </IconButton>
                        {podeEditar && (
                          <IconButton
                            edge="end"
                            color="error"
                            onClick={() => {
                              // Implementar exclusão de documento
                              showToast('Funcionalidade de exclusão em desenvolvimento', 'info');
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < contrato.documentos.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Aba 4: Histórico */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" mb={3}>
            Histórico de Alterações
          </Typography>

          {contrato.historicoAlteracoes.length === 0 ? (
            <Alert severity="info">
              Nenhuma alteração registrada para este contrato.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Campo</TableCell>
                    <TableCell>Valor Anterior</TableCell>
                    <TableCell>Valor Novo</TableCell>
                    <TableCell>Alterado Por</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contrato.historicoAlteracoes
                    .sort((a, b) => new Date(b.dataAlteracao).getTime() - new Date(a.dataAlteracao).getTime())
                    .map((alteracao) => (
                    <TableRow key={alteracao.id}>
                      <TableCell>
                        {format(new Date(alteracao.dataAlteracao), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{alteracao.campoAlterado}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {alteracao.valorAntigo}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="primary">
                          {alteracao.valorNovo}
                        </Typography>
                      </TableCell>
                      <TableCell>{alteracao.alteradoPor}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Card>

      {/* Dialog: Adicionar Colaboradores */}
      <Dialog
        open={showAddColaborador}
        onClose={() => setShowAddColaborador(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Adicionar Colaboradores ao Contrato</DialogTitle>
        <DialogContent>
          <Autocomplete
            multiple
            options={colaboradoresDisponiveis.filter(c => 
              !contrato.colaboradores.some(cc => cc.id === c.id)
            )}
            getOptionLabel={(option) => `${option.nome} - ${option.cargo}`}
            value={selectedColaboradores}
            onChange={(_, newValue) => setSelectedColaboradores(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Selecionar Colaboradores"
                placeholder="Digite para buscar..."
                fullWidth
                margin="normal"
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box>
                  <Typography variant="body1">{option.nome}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {option.cargo} • {option.status}
                  </Typography>
                </Box>
              </li>
            )}
          />
          {selectedColaboradores.length > 0 && (
            <Typography variant="body2" color="text.secondary" mt={2}>
              {selectedColaboradores.length} colaborador(es) selecionado(s)
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddColaborador(false)}>
            Cancelar
          </Button>
          <Button
            onClick={adicionarColaboradores}
            variant="contained"
            disabled={selectedColaboradores.length === 0}
          >
            Adicionar {selectedColaboradores.length > 0 && `(${selectedColaboradores.length})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Upload Documento */}
      <Dialog
        open={showUploadDoc}
        onClose={() => setShowUploadDoc(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload de Documento</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome do Documento"
            fullWidth
            value={docNome}
            onChange={(e) => setDocNome(e.target.value)}
            margin="normal"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Tipo de Documento</InputLabel>
            <Select
              value={docTipo}
              label="Tipo de Documento"
              onChange={(e) => setDocTipo(e.target.value as any)}
            >
              <MenuItem value="Contrato">Contrato</MenuItem>
              <MenuItem value="Aditivo">Aditivo</MenuItem>
              <MenuItem value="Memorando">Memorando</MenuItem>
              <MenuItem value="Outro">Outro</MenuItem>
            </Select>
          </FormControl>

          <Box mt={2}>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
              id="upload-file"
            />
            <label htmlFor="upload-file">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                fullWidth
              >
                {uploadFile ? uploadFile.name : 'Selecionar Arquivo'}
              </Button>
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadDoc(false)}>
            Cancelar
          </Button>
          <Button
            onClick={uploadDocumento}
            variant="contained"
            disabled={!uploadFile || !docNome}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContratoDetalhesPage; 