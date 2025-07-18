import React from 'react';
import {
  Box, Typography, Button, Stack, TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, MenuItem, Pagination, CircularProgress
} from '@mui/material';
import { listarAtestadosApi, aprovarAtestadoApi, rejeitarAtestadoApi } from '../services/api';

const tipos = ['Atestado Médico', 'Abono', 'Justificativa'];
const statusList = ['Pendente', 'Aprovado', 'Rejeitado'];

const AtestadosPage: React.FC = () => {
  const [filtroColaborador, setFiltroColaborador] = React.useState('');
  const [filtroTipo, setFiltroTipo] = React.useState('');
  const [filtroStatus, setFiltroStatus] = React.useState('');
  const [pagina, setPagina] = React.useState(1);
  const [porPagina] = React.useState(10);
  const [dados, setDados] = React.useState<any[]>([]);
  const [totalPaginas, setTotalPaginas] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    console.log('🔄 ATESTADOS: Carregando página de atestados...');
    console.log('📋 Parâmetros:', { pagina, porPagina, filtroStatus, filtroTipo, filtroColaborador });
    
    setLoading(true);
    listarAtestadosApi({
      page: pagina,
      limit: porPagina,
      status: filtroStatus,
      tipo: filtroTipo,
      search: filtroColaborador,
    })
      .then(res => {
        console.log('✅ ATESTADOS: Resposta recebida:', res);
        console.log('📊 Solicitações encontradas:', res.solicitacoes?.length || 0);
        setDados(res.solicitacoes || []);
        setTotalPaginas(res.pages || 1);
      })
      .catch(error => {
        console.error('❌ ATESTADOS: Erro ao carregar:', error);
        console.error('📋 Detalhes do erro:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
      })
      .finally(() => {
        console.log('🏁 ATESTADOS: Carregamento finalizado');
        setLoading(false);
      });
  }, [pagina, porPagina, filtroColaborador, filtroTipo, filtroStatus]);

  const aprovar = async (id: number) => {
    setLoading(true);
    await aprovarAtestadoApi(id);
    // Atualiza a lista após aprovar
    listarAtestadosApi({
      page: pagina,
      limit: porPagina,
      status: filtroStatus,
      tipo: filtroTipo,
      search: filtroColaborador,
    }).then(res => {
      setDados(res.solicitacoes || []);
      setTotalPaginas(res.pages || 1);
      setLoading(false);
    });
  };
  const rejeitar = async (id: number) => {
    setLoading(true);
    await rejeitarAtestadoApi(id);
    // Atualiza a lista após rejeitar
    listarAtestadosApi({
      page: pagina,
      limit: porPagina,
      status: filtroStatus,
      tipo: filtroTipo,
      search: filtroColaborador,
    }).then(res => {
      setDados(res.solicitacoes || []);
      setTotalPaginas(res.pages || 1);
      setLoading(false);
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Atestados e Abonos</Typography>
      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          label="Colaborador"
          value={filtroColaborador}
          onChange={e => { setFiltroColaborador(e.target.value); setPagina(1); }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          select
          label="Tipo"
          value={filtroTipo}
          onChange={e => { setFiltroTipo(e.target.value); setPagina(1); }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {tipos.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField
          select
          label="Status"
          value={filtroStatus}
          onChange={e => { setFiltroStatus(e.target.value); setPagina(1); }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {statusList.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Stack>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Colaborador</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Justificativa</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      {loading ? 'Carregando atestados...' : 'Nenhuma solicitação encontrada'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      Debug: {dados.length} itens carregados
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                dados.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.colaborador}</TableCell>
                    <TableCell>{item.tipo}</TableCell>
                    <TableCell>{item.data.split('-').reverse().join('/')}</TableCell>
                    <TableCell>
                      <Chip label={item.status} color={item.status === 'Aprovado' ? 'success' : item.status === 'Rejeitado' ? 'error' : 'warning'} size="small" />
                    </TableCell>
                    <TableCell>{item.justificativa}</TableCell>
                    <TableCell align="right">
                      {item.status === 'Pendente' && (
                        <>
                          <Button color="success" size="small" onClick={() => aprovar(item.id)}>Aprovar</Button>
                          <Button color="error" size="small" onClick={() => rejeitar(item.id)}>Rejeitar</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
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

export default AtestadosPage; 