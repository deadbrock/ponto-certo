import React from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Alert, TextField, MenuItem, Pagination, CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import { useAuth } from '../contexts/AuthContext';
import { listarUsuariosApi, ativarUsuarioApi, desativarUsuarioApi } from '../services/api';

const perfis = ['Administrador', 'Gestor', 'RH'];

const UsuariosPage: React.FC = () => {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = React.useState<any[]>([]);
  const [pagina, setPagina] = React.useState(1);
  const [porPagina] = React.useState(10);
  const [totalPaginas, setTotalPaginas] = React.useState(1);
  const [filtroPerfil, setFiltroPerfil] = React.useState('');
  const [filtroStatus, setFiltroStatus] = React.useState('');
  const [filtroBusca, setFiltroBusca] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    listarUsuariosApi({
      page: pagina,
      limit: porPagina,
      perfil: filtroPerfil,
      ativo: filtroStatus === '' ? undefined : filtroStatus === 'Ativo',
      search: filtroBusca,
    })
      .then(res => {
        setUsuarios(res.usuarios || []);
        setTotalPaginas(res.pages || 1);
      })
      .finally(() => setLoading(false));
  }, [pagina, porPagina, filtroPerfil, filtroStatus, filtroBusca]);

  const handleToggleAtivo = async (id: number, ativo: boolean) => {
    setLoading(true);
    try {
      if (ativo) {
        await desativarUsuarioApi(id);
      } else {
        await ativarUsuarioApi(id);
      }
      // Atualiza a lista após ativar/desativar
      listarUsuariosApi({
        page: pagina,
        limit: porPagina,
        perfil: filtroPerfil,
        ativo: filtroStatus === '' ? undefined : filtroStatus === 'Ativo',
        search: filtroBusca,
      }).then(res => {
        setUsuarios(res.usuarios || []);
        setTotalPaginas(res.pages || 1);
      });
    } finally {
      setLoading(false);
    }
  };

  if (usuario?.perfil !== 'Administrador' && usuario?.perfil !== 'RH') {
    return <Alert severity="error">Acesso negado. Você não tem permissão para visualizar esta página.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Usuários</Typography>
      <Box display="flex" gap={2} mb={2}>
        <TextField
          select
          label="Perfil"
          value={filtroPerfil}
          onChange={e => { setFiltroPerfil(e.target.value); setPagina(1); }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {perfis.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        <TextField
          select
          label="Status"
          value={filtroStatus}
          onChange={e => { setFiltroStatus(e.target.value); setPagina(1); }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="Ativo">Ativo</MenuItem>
          <MenuItem value="Inativo">Inativo</MenuItem>
        </TextField>
        <TextField
          label="Busca (nome ou e-mail)"
          value={filtroBusca}
          onChange={e => { setFiltroBusca(e.target.value); setPagina(1); }}
          sx={{ minWidth: 220 }}
        />
        <Button variant="contained" color="primary" sx={{ ml: 'auto' }}>Novo Usuário</Button>
      </Box>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell>Perfil</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuarios.map(usuario => (
                <TableRow key={usuario.id}>
                  <TableCell>{usuario.nome}</TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>{usuario.perfil}</TableCell>
                  <TableCell>
                    {usuario.ativo ? <Chip label="Ativo" color="success" size="small" /> : <Chip label="Inativo" color="default" size="small" />}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton color="primary"><EditIcon /></IconButton>
                    <IconButton color={usuario.ativo ? 'success' : 'default'} onClick={() => handleToggleAtivo(usuario.id, usuario.ativo)}>
                      {usuario.ativo ? <ToggleOnIcon /> : <ToggleOffIcon />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Box display="flex" justifyContent="center" mt={2}>
        <Pagination
          count={totalPaginas}
          page={pagina}
          onChange={(_, value) => setPagina(value)}
          color="primary"
        />
      </Box>
    </Box>
  );
};

export default UsuariosPage; 