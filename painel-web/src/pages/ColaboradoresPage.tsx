import React from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Alert, TextField, MenuItem, Pagination, CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ColaboradoresPage: React.FC = () => {
  const { usuario } = useAuth();
  const [colaboradores, setColaboradores] = React.useState<any[]>([]);
  const [pagina, setPagina] = React.useState(1);
  const [porPagina] = React.useState(10);
  const [totalPaginas, setTotalPaginas] = React.useState(1);
  const [filtroBusca, setFiltroBusca] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    carregarColaboradores();
  }, [pagina, porPagina, filtroBusca]);

  const carregarColaboradores = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
              const response = await api.get(`/colaboradores/public?page=${pagina}&limit=${porPagina}&search=${filtroBusca}`);
      
      if (response.data.success) {
        setColaboradores(response.data.colaboradores || []);
        setTotalPaginas(Math.ceil(response.data.total / porPagina) || 1);
      }
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
    } finally {
      setLoading(false);
    }
  };

  if (usuario?.perfil !== 'Administrador' && usuario?.perfil !== 'RH') {
    return <Alert severity="error">Acesso negado. Você não tem permissão para visualizar esta página.</Alert>;
  }

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <PersonIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          Colaboradores
        </Typography>
      </Box>
      
      <Typography variant="body1" color="text.secondary" mb={3}>
        Gerencie os colaboradores cadastrados no sistema de reconhecimento facial
      </Typography>

      <Box display="flex" gap={2} mb={3}>
        <TextField
          label="Buscar por nome ou CPF"
          value={filtroBusca}
          onChange={e => { setFiltroBusca(e.target.value); setPagina(1); }}
          sx={{ minWidth: 300 }}
          size="small"
        />
        <Button 
          variant="contained" 
          color="primary" 
          sx={{ ml: 'auto' }}
          startIcon={<PersonIcon />}
        >
          Ir para Totem
        </Button>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={2} sx={{ borderRadius: 2 }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell><strong>Nome</strong></TableCell>
                  <TableCell><strong>CPF</strong></TableCell>
                  <TableCell><strong>Data Cadastro</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Ações</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {colaboradores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        Nenhum colaborador encontrado
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        Os colaboradores são cadastrados através do totem com reconhecimento facial
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  colaboradores.map((colaborador, index) => (
                    <TableRow key={colaborador.id || index} hover>
                      <TableCell>{colaborador.nome || 'N/A'}</TableCell>
                      <TableCell>{colaborador.cpf || 'N/A'}</TableCell>
                      <TableCell>
                        {colaborador.data_cadastro 
                          ? new Date(colaborador.data_cadastro).toLocaleDateString('pt-BR')
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label="Ativo" 
                          color="success" 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton color="primary" size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton color="error" size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {colaboradores.length > 0 && (
            <Box display="flex" justifyContent="center" p={2}>
              <Pagination
                count={totalPaginas}
                page={pagina}
                onChange={(_, value) => setPagina(value)}
                color="primary"
                size="small"
              />
            </Box>
          )}
        </Paper>
      )}
      
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>💡 Como cadastrar colaboradores:</strong><br/>
          Os colaboradores devem ser cadastrados diretamente no totem usando o reconhecimento facial. 
          Acesse o totem e utilize a opção "Cadastro" para registrar novos funcionários.
        </Typography>
      </Alert>
    </Box>
  );
};

export default ColaboradoresPage; 