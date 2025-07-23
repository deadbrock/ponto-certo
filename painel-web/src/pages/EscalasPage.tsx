import React from 'react';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Chip, IconButton, Pagination,
  Autocomplete, CircularProgress, Alert, Grid
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Event as EventIcon,
  Schedule as ScheduleIcon 
} from '@mui/icons-material';
import { api } from '../services/api';

interface Escala {
  id: number;
  colaborador_id: number;
  colaborador_nome?: string;
  tipo_escala: string;
  horario_inicio: string;
  horario_fim: string;
  dias_semana: number[];
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
  ativo: boolean;
}

interface Feriado {
  id: number;
  nome: string;
  data_feriado: string;
  tipo: string;
  recorrente: boolean;
  observacoes?: string;
}

// APIs
const listarEscalasApi = async (params: any) => {
  const response = await api.get('/escalas', { params });
  return response.data;
};

const criarEscalaApi = async (dados: any) => {
  const response = await api.post('/escalas', dados);
  return response.data;
};

const editarEscalaApi = async (id: number, dados: any) => {
  const response = await api.put(`/escalas/${id}`, dados);
  return response.data;
};

const excluirEscalaApi = async (id: number) => {
  const response = await api.delete(`/escalas/${id}`);
  return response.data;
};

const listarFeriadosApi = async () => {
  const response = await api.get('/escalas/feriados');
  return response.data;
};

const criarFeriadoApi = async (dados: any) => {
  const response = await api.post('/escalas/feriados', dados);
  return response.data;
};

const buscarColaboradoresApi = async (termo: string, page: number) => {
  const response = await api.get('/colaboradores', { 
    params: { search: termo, page, limit: 10 } 
  });
  return response.data;
};

const EscalasPage: React.FC = () => {
  const [escalas, setEscalas] = React.useState<Escala[]>([]);
  const [feriados, setFeriados] = React.useState<Feriado[]>([]);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    colaborador_id: '',
    tipo_escala: '',
    horario_inicio: '',
    horario_fim: '',
    dias_semana: [] as number[],
    data_inicio: '',
    data_fim: '',
    observacoes: '',
  });
  const [erro, setErro] = React.useState('');
  const [editId, setEditId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingPage, setLoadingPage] = React.useState(true);

  // Autocomplete assíncrono com backend
  const [inputColab, setInputColab] = React.useState('');
  const [opcoesColab, setOpcoesColab] = React.useState<any[]>([]);
  const [loadingColab, setLoadingColab] = React.useState(false);

  // Feriado
  const [openFeriado, setOpenFeriado] = React.useState(false);
  const [formFeriado, setFormFeriado] = React.useState({ 
    nome: '', 
    data_feriado: '', 
    tipo: 'nacional',
    recorrente: false,
    observacoes: '' 
  });
  const [erroFeriado, setErroFeriado] = React.useState('');

  // Paginação
  const [pagina, setPagina] = React.useState(1);
  const [porPagina] = React.useState(10);
  const [totalPaginas, setTotalPaginas] = React.useState(1);

  // Carregar dados ao montar componente
  React.useEffect(() => {
    carregarDados();
  }, [pagina]);

  const carregarDados = async () => {
    try {
      setLoadingPage(true);
      
      const [escalasResponse, feriadosResponse] = await Promise.all([
        listarEscalasApi({ page: pagina, limit: porPagina }),
        listarFeriadosApi()
      ]);

      if (escalasResponse.success) {
        setEscalas(escalasResponse.escalas || []);
        setTotalPaginas(escalasResponse.pages || 1);
      } else {
        console.error('Erro ao carregar escalas:', escalasResponse.error);
        setEscalas([]);
      }

      if (feriadosResponse.success) {
        setFeriados(feriadosResponse.feriados || []);
      } else {
        console.error('Erro ao carregar feriados:', feriadosResponse.error);
        setFeriados([]);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setEscalas([]);
      setFeriados([]);
    } finally {
      setLoadingPage(false);
    }
  };

  // Autocomplete de colaboradores
  React.useEffect(() => {
    if (inputColab.length < 2) {
      setOpcoesColab([]);
      return;
    }
    
    const buscarColaboradores = async () => {
      try {
        setLoadingColab(true);
        const response = await buscarColaboradoresApi(inputColab, 1);
        
        if (response.success) {
          setOpcoesColab(response.colaboradores || []);
        } else {
          setOpcoesColab([]);
        }
      } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
        setOpcoesColab([]);
      } finally {
        setLoadingColab(false);
      }
    };

    const timeoutId = setTimeout(buscarColaboradores, 300);
    return () => clearTimeout(timeoutId);
  }, [inputColab]);

  const abrirFormulario = (escala?: Escala) => {
    if (escala) {
      setEditId(escala.id);
      setForm({
        colaborador_id: escala.colaborador_id.toString(),
        tipo_escala: escala.tipo_escala,
        horario_inicio: escala.horario_inicio,
        horario_fim: escala.horario_fim,
        dias_semana: escala.dias_semana || [],
        data_inicio: escala.data_inicio || '',
        data_fim: escala.data_fim || '',
        observacoes: escala.observacoes || '',
      });
      
      // Buscar nome do colaborador para autocomplete
      if (escala.colaborador_nome) {
        setInputColab(escala.colaborador_nome);
        setOpcoesColab([{
          id: escala.colaborador_id,
          nome: escala.colaborador_nome
        }]);
      }
    } else {
      setEditId(null);
      setForm({
        colaborador_id: '',
        tipo_escala: '',
        horario_inicio: '',
        horario_fim: '',
        dias_semana: [],
        data_inicio: '',
        data_fim: '',
        observacoes: '',
      });
      setInputColab('');
    }
    setErro('');
    setOpen(true);
  };

  const salvarEscala = async () => {
    try {
      setLoading(true);
      setErro('');

      if (!form.colaborador_id || !form.tipo_escala || !form.horario_inicio || !form.horario_fim) {
        setErro('Colaborador, tipo de escala, horário de início e fim são obrigatórios');
        return;
      }

      const dados = {
        ...form,
        colaborador_id: parseInt(form.colaborador_id),
        dias_semana: form.dias_semana
      };

      let response;
      if (editId) {
        response = await editarEscalaApi(editId, dados);
      } else {
        response = await criarEscalaApi(dados);
      }

      if (response.success) {
        setOpen(false);
        carregarDados();
      } else {
        setErro(response.error || 'Erro ao salvar escala');
      }

    } catch (error: any) {
      console.error('Erro ao salvar escala:', error);
      setErro(error.response?.data?.error || 'Erro interno do servidor');
    } finally {
      setLoading(false);
    }
  };

  const excluirEscala = async (id: number) => {
    if (!window.confirm('Deseja realmente excluir esta escala?')) return;

    try {
      const response = await excluirEscalaApi(id);
      
      if (response.success) {
        carregarDados();
      } else {
        alert('Erro ao excluir escala: ' + response.error);
      }
    } catch (error: any) {
      console.error('Erro ao excluir escala:', error);
      alert('Erro interno do servidor');
    }
  };

  const salvarFeriado = async () => {
    try {
      if (!formFeriado.nome || !formFeriado.data_feriado) {
        setErroFeriado('Nome e data são obrigatórios');
        return;
      }

      const response = await criarFeriadoApi(formFeriado);
      
      if (response.success) {
        setOpenFeriado(false);
        setFormFeriado({ nome: '', data_feriado: '', tipo: 'nacional', recorrente: false, observacoes: '' });
        carregarDados();
      } else {
        setErroFeriado(response.error || 'Erro ao salvar feriado');
      }
    } catch (error: any) {
      console.error('Erro ao salvar feriado:', error);
      setErroFeriado(error.response?.data?.error || 'Erro interno do servidor');
    }
  };

  const diasSemanaOptions = [
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terça' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' }
  ];

  if (loadingPage) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando escalas...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom display="flex" alignItems="center">
        <ScheduleIcon sx={{ mr: 2 }} />
        Escalas e Feriados
      </Typography>

      <Grid container spacing={3}>
        {/* Escalas */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Escalas de Trabalho</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => abrirFormulario()}
                >
                  Nova Escala
                </Button>
              </Box>

              {escalas.length === 0 ? (
                <Alert severity="info">
                  Nenhuma escala cadastrada. Clique em "Nova Escala" para começar.
                </Alert>
              ) : (
                <>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Colaborador</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Horário</TableCell>
                          <TableCell>Dias</TableCell>
                          <TableCell>Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {escalas.map((escala) => (
                          <TableRow key={escala.id}>
                            <TableCell>{escala.colaborador_nome || `ID: ${escala.colaborador_id}`}</TableCell>
                            <TableCell>
                              <Chip 
                                label={escala.tipo_escala} 
                                size="small" 
                                color="primary" 
                                variant="outlined" 
                              />
                            </TableCell>
                            <TableCell>
                              {escala.horario_inicio} - {escala.horario_fim}
                            </TableCell>
                            <TableCell>
                              {escala.dias_semana?.map(dia => 
                                diasSemanaOptions.find(d => d.value === dia)?.label
                              ).join(', ') || 'Não definido'}
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                onClick={() => abrirFormulario(escala)}
                                size="small"
                                color="primary"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton 
                                onClick={() => excluirEscala(escala.id)}
                                size="small"
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box display="flex" justifyContent="center" mt={2}>
                    <Pagination
                      count={totalPaginas}
                      page={pagina}
                      onChange={(_, page) => setPagina(page)}
                      color="primary"
                    />
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Feriados */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Feriados</Typography>
                <Button
                  variant="outlined"
                  startIcon={<EventIcon />}
                  onClick={() => setOpenFeriado(true)}
                  size="small"
                >
                  Novo
                </Button>
              </Box>

              {feriados.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Nenhum feriado cadastrado.
                </Alert>
              ) : (
                <Box maxHeight={400} overflow="auto">
                  {feriados.map((feriado) => (
                    <Box key={feriado.id} mb={1} p={1} border={1} borderColor="grey.300" borderRadius={1}>
                      <Typography variant="body2" fontWeight="bold">
                        {feriado.nome}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(feriado.data_feriado).toLocaleDateString('pt-BR')}
                      </Typography>
                      <Chip 
                        label={feriado.tipo} 
                        size="small" 
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog Nova/Editar Escala */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editId ? 'Editar Escala' : 'Nova Escala'}
        </DialogTitle>
        <DialogContent>
          {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={opcoesColab}
                getOptionLabel={(option) => option.nome || ''}
                value={opcoesColab.find(opt => opt.id.toString() === form.colaborador_id) || null}
                onChange={(_, newValue) => {
                  setForm(prev => ({ ...prev, colaborador_id: newValue?.id?.toString() || '' }));
                }}
                inputValue={inputColab}
                onInputChange={(_, newInputValue) => setInputColab(newInputValue)}
                loading={loadingColab}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Colaborador"
                    fullWidth
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingColab ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Tipo de Escala</InputLabel>
                <Select
                  value={form.tipo_escala}
                  onChange={(e) => setForm(prev => ({ ...prev, tipo_escala: e.target.value }))}
                  label="Tipo de Escala"
                >
                  <MenuItem value="fixo">Fixo</MenuItem>
                  <MenuItem value="revezamento">Revezamento</MenuItem>
                  <MenuItem value="flexivel">Flexível</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                label="Início"
                type="time"
                value={form.horario_inicio}
                onChange={(e) => setForm(prev => ({ ...prev, horario_inicio: e.target.value }))}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                label="Fim"
                type="time"
                value={form.horario_fim}
                onChange={(e) => setForm(prev => ({ ...prev, horario_fim: e.target.value }))}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Dias da Semana</InputLabel>
                <Select
                  multiple
                  value={form.dias_semana}
                  onChange={(e) => setForm(prev => ({ 
                    ...prev, 
                    dias_semana: typeof e.target.value === 'string' ? [] : e.target.value 
                  }))}
                  label="Dias da Semana"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const dia = diasSemanaOptions.find(d => d.value === value);
                        return <Chip key={value} label={dia?.label} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {diasSemanaOptions.map((dia) => (
                    <MenuItem key={dia.value} value={dia.value}>
                      {dia.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Data Início"
                type="date"
                value={form.data_inicio}
                onChange={(e) => setForm(prev => ({ ...prev, data_inicio: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Data Fim"
                type="date"
                value={form.data_fim}
                onChange={(e) => setForm(prev => ({ ...prev, data_fim: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Observações"
                value={form.observacoes}
                onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button 
            onClick={salvarEscala} 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : (editId ? 'Atualizar' : 'Criar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Novo Feriado */}
      <Dialog open={openFeriado} onClose={() => setOpenFeriado(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Feriado</DialogTitle>
        <DialogContent>
          {erroFeriado && <Alert severity="error" sx={{ mb: 2 }}>{erroFeriado}</Alert>}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Nome do Feriado"
                value={formFeriado.nome}
                onChange={(e) => setFormFeriado(prev => ({ ...prev, nome: e.target.value }))}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Data"
                type="date"
                value={formFeriado.data_feriado}
                onChange={(e) => setFormFeriado(prev => ({ ...prev, data_feriado: e.target.value }))}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={formFeriado.tipo}
                  onChange={(e) => setFormFeriado(prev => ({ ...prev, tipo: e.target.value }))}
                  label="Tipo"
                >
                  <MenuItem value="nacional">Nacional</MenuItem>
                  <MenuItem value="estadual">Estadual</MenuItem>
                  <MenuItem value="municipal">Municipal</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Observações"
                value={formFeriado.observacoes}
                onChange={(e) => setFormFeriado(prev => ({ ...prev, observacoes: e.target.value }))}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFeriado(false)}>Cancelar</Button>
          <Button onClick={salvarFeriado} variant="contained">
            Criar Feriado
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EscalasPage; 