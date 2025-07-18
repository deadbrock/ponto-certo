import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  TextField, Stack, Button, Alert, CircularProgress, TablePagination, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import { listarLogsAuditoriaApi, LogAuditoria } from '../services/api';

const AuditoriaPage: React.FC = () => {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  
  // Filtros
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const carregarLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listarLogsAuditoriaApi({
        limite: rowsPerPage,
        offset: page * rowsPerPage,
        usuario: filtroUsuario || undefined,
        acao: filtroAcao || undefined,
        data_inicio: filtroDataInicio || undefined,
        data_fim: filtroDataFim || undefined
      });
      
      setLogs(result.logs || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      setError('Erro ao carregar logs de auditoria: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, [rowsPerPage, page, filtroUsuario, filtroAcao, filtroDataInicio, filtroDataFim]);

  const handlePesquisar = () => {
    setPage(0); // Reset para primeira página
    carregarLogs();
  };

  const handleLimparFiltros = () => {
    setFiltroUsuario('');
    setFiltroAcao('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getChipColor = (acao: string) => {
    if (acao.includes('Login')) return 'info';
    if (acao.includes('Cadastro') || acao.includes('Criação')) return 'success';
    if (acao.includes('Exclusão') || acao.includes('Desativação')) return 'error';
    if (acao.includes('Edição') || acao.includes('Alteração')) return 'warning';
    return 'primary';
  };

  useEffect(() => {
    carregarLogs();
  }, [page, rowsPerPage]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Auditoria do Sistema</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Filtros de Pesquisa</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Usuário"
                value={filtroUsuario}
                onChange={(e) => setFiltroUsuario(e.target.value)}
                placeholder="Nome do usuário"
                size="small"
                sx={{ minWidth: 200 }}
              />
              <TextField
                label="Ação"
                value={filtroAcao}
                onChange={(e) => setFiltroAcao(e.target.value)}
                placeholder="Ex: Login, Cadastro"
                size="small"
                sx={{ minWidth: 200 }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Data Início"
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <TextField
                label="Data Fim"
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <Button 
                variant="contained" 
                startIcon={<SearchIcon />}
                onClick={handlePesquisar}
              >
                Pesquisar
              </Button>
              <Button 
                variant="outlined" 
                onClick={handleLimparFiltros}
              >
                Limpar Filtros
              </Button>
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data/Hora</TableCell>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Ação</TableCell>
                  <TableCell>Detalhes</TableCell>
                  <TableCell>IP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {new Date(item.data_hora).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {item.usuario_nome || 'Sistema'}
                          </Typography>
                          {item.usuario_email && (
                            <Typography variant="caption" color="text.secondary">
                              {item.usuario_email}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={item.acao} 
                          color={getChipColor(item.acao)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300, wordBreak: 'break-word' }}>
                          {item.detalhes}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {item.ip_address || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Registros por página:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
            }
          />
        </>
      )}

      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Informações sobre auditoria:</strong> Todos os acessos e ações dos usuários são registrados automaticamente para fins de segurança e conformidade. Os logs são mantidos por no mínimo 2 anos.
        </Typography>
      </Box>
    </Box>
  );
};

export default AuditoriaPage; 