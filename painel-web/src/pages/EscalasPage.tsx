import React from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, CircularProgress, IconButton, Stack
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { listarEscalasApi, cadastrarEscalaApi, editarEscalaApi, excluirEscalaApi, listarFeriadosApi, cadastrarFeriadoApi, salvarParametrosSindicaisApi, buscarColaboradoresApi } from '../services/api';

interface Escala {
  id: number;
  colaboradorOuEquipe: string;
  tipo: string;
  horario: string;
  vigencia: string;
}

interface Feriado {
  id: number;
  nome: string;
  data: string;
}

const tiposJornada = ['Fixa', '12x36', 'Híbrida', 'Outros'];

// Busca real de colaboradores no backend
const buscarColaboradores = async (input: string): Promise<string[]> => {
  try {
    const response = await fetch(`http://localhost:3333/api/colaboradores/buscar?q=${encodeURIComponent(input)}`);
    if (response.ok) {
      const data = await response.json();
      return data.colaboradores?.map((c: any) => c.nome) || [];
    }
    return [];
  } catch (error) {
    console.error('Erro ao buscar colaboradores:', error);
    return [];
  }
};

const EscalasPage: React.FC = () => {
  const [paramSindical, setParamSindical] = React.useState('');
  const [escalas, setEscalas] = React.useState<Escala[]>([]);
  const [feriados, setFeriados] = React.useState<Feriado[]>([]);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    colaboradorOuEquipe: '',
    tipo: '',
    horario: '',
    vigencia: '',
  });
  const [erro, setErro] = React.useState('');
  const [editId, setEditId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Autocomplete assíncrono com backend
  const [inputColab, setInputColab] = React.useState('');
  const [opcoesColab, setOpcoesColab] = React.useState<string[]>([]);
  const [loadingColab, setLoadingColab] = React.useState(false);

  // Feriado
  const [openFeriado, setOpenFeriado] = React.useState(false);
  const [formFeriado, setFormFeriado] = React.useState({ nome: '', data: '' });
  const [erroFeriado, setErroFeriado] = React.useState('');

  // Paginação
  const [pagina, setPagina] = React.useState(1);
  const [porPagina] = React.useState(10);
  const [totalPaginas, setTotalPaginas] = React.useState(1);

  // Buscar escalas do backend
  React.useEffect(() => {
    setLoading(true);
    listarEscalasApi({ page: pagina, limit: porPagina }).then(res => {
      setEscalas(res.escalas || []);
      setTotalPaginas(res.pages || 1);
      setLoading(false);
    });
    listarFeriadosApi().then(res => setFeriados(res.feriados || []));
  }, [pagina, porPagina]);

  // Autocomplete de colaboradores
  React.useEffect(() => {
    if (inputColab.length < 2) {
      setOpcoesColab([]);
      return;
    }
    setLoadingColab(true);
    buscarColaboradoresApi(inputColab, 1).then(res => {
      setOpcoesColab(res.colaboradores?.map((c: any) => c.nome) || []);
      setLoadingColab(false);
    }).catch(() => setLoadingColab(false));
  }, [inputColab]);

  const handleOpen = () => {
    setForm({ colaboradorOuEquipe: '', tipo: '', horario: '', vigencia: '' });
    setErro('');
    setEditId(null);
    setOpen(true);
    setInputColab('');
    setOpcoesColab([]);
  };
  const handleClose = () => setOpen(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSalvar = async () => {
    if (!form.colaboradorOuEquipe || !form.tipo || !form.horario || !form.vigencia) {
      setErro('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    if (editId) {
      await editarEscalaApi(editId, form);
    } else {
      await cadastrarEscalaApi(form);
    }
    setOpen(false);
    listarEscalasApi({ page: pagina, limit: porPagina }).then(res => {
      setEscalas(res.escalas || []);
      setTotalPaginas(res.pages || 1);
      setLoading(false);
    });
  };

  const handleEditar = (escala: Escala) => {
    setForm({
      colaboradorOuEquipe: escala.colaboradorOuEquipe,
      tipo: escala.tipo,
      horario: escala.horario,
      vigencia: escala.vigencia,
    });
    setEditId(escala.id);
    setErro('');
    setOpen(true);
    setInputColab(escala.colaboradorOuEquipe);
  };

  const handleExcluir = async (id: number) => {
    setLoading(true);
    await excluirEscalaApi(id);
    listarEscalasApi({ page: pagina, limit: porPagina }).then(res => {
      setEscalas(res.escalas || []);
      setTotalPaginas(res.pages || 1);
      setLoading(false);
    });
  };

  // Feriados
  const handleOpenFeriado = () => {
    setFormFeriado({ nome: '', data: '' });
    setErroFeriado('');
    setOpenFeriado(true);
  };
  const handleCloseFeriado = () => setOpenFeriado(false);
  const handleSalvarFeriado = async () => {
    if (!formFeriado.nome || !formFeriado.data) {
      setErroFeriado('Preencha todos os campos.');
      return;
    }
    await cadastrarFeriadoApi(formFeriado);
    setOpenFeriado(false);
    listarFeriadosApi().then(res => setFeriados(res.feriados || []));
  };

  // Parâmetros sindicais
  const handleSalvarParametros = async () => {
    await salvarParametrosSindicaisApi(paramSindical);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Escalas e Jornadas</Typography>
      <Button variant="contained" color="primary" sx={{ mb: 2 }} onClick={handleOpen}>Cadastrar Nova Escala</Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editId ? 'Editar Escala' : 'Cadastrar Nova Escala'}</DialogTitle>
        <DialogContent sx={{ minWidth: 350 }}>
          <Autocomplete
            freeSolo
            options={opcoesColab}
            loading={loadingColab}
            inputValue={inputColab}
            value={form.colaboradorOuEquipe}
            onInputChange={(_, value) => setInputColab(value)}
            onChange={(_, value) => setForm(f => ({ ...f, colaboradorOuEquipe: value || '' }))}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Colaborador/Equipe"
                margin="normal"
                fullWidth
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingColab ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                helperText="Digite ao menos 2 letras para buscar"
              />
            )}
          />
          <TextField
            select
            label="Tipo de Jornada"
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            fullWidth
            margin="normal"
          >
            {tiposJornada.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField
            label="Horário"
            name="horario"
            value={form.horario}
            onChange={handleChange}
            fullWidth
            margin="normal"
            placeholder="Ex: 08:00-18:00"
          />
          <TextField
            label="Vigência"
            name="vigencia"
            value={form.vigencia}
            onChange={handleChange}
            fullWidth
            margin="normal"
            placeholder="Ex: 01/07/2024 a 31/07/2024"
          />
          {erro && <Typography color="error" variant="body2">{erro}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSalvar} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
      <Typography variant="h6" gutterBottom>Escalas Cadastradas</Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Colaborador/Equipe</TableCell>
                <TableCell>Tipo de Jornada</TableCell>
                <TableCell>Horário</TableCell>
                <TableCell>Vigência</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {escalas.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.colaboradorOuEquipe}</TableCell>
                  <TableCell>{item.tipo}</TableCell>
                  <TableCell>{item.horario}</TableCell>
                  <TableCell>{item.vigencia}</TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" onClick={() => handleEditar(item)}><EditIcon /></IconButton>
                    <IconButton color="error" onClick={() => handleExcluir(item.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Typography variant="h6" gutterBottom>Feriados Regionais</Typography>
      <Button variant="outlined" sx={{ mb: 2 }} onClick={handleOpenFeriado}>Cadastrar Feriado</Button>
      <Dialog open={openFeriado} onClose={handleCloseFeriado}>
        <DialogTitle>Cadastrar Feriado</DialogTitle>
        <DialogContent sx={{ minWidth: 350 }}>
          <TextField
            label="Nome"
            name="nome"
            value={formFeriado.nome}
            onChange={e => setFormFeriado(f => ({ ...f, nome: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Data"
            name="data"
            value={formFeriado.data}
            onChange={e => setFormFeriado(f => ({ ...f, data: e.target.value }))}
            fullWidth
            margin="normal"
            placeholder="Ex: 07/09/2024"
          />
          {erroFeriado && <Typography color="error" variant="body2">{erroFeriado}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFeriado}>Cancelar</Button>
          <Button onClick={handleSalvarFeriado} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {feriados.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.nome}</TableCell>
                <TableCell>{item.data}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="h6" gutterBottom>Parâmetros Sindicais</Typography>
      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          multiline
          minRows={3}
          fullWidth
          placeholder="Informe observações, regras ou parâmetros sindicais relevantes para a escala."
          value={paramSindical}
          onChange={e => setParamSindical(e.target.value)}
        />
        <Button variant="contained" color="primary" onClick={handleSalvarParametros}>Salvar</Button>
      </Stack>
    </Box>
  );
};

export default EscalasPage; 