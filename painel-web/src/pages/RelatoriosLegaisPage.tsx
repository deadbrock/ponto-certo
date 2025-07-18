import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Stack,
  TextField, Alert, CircularProgress, TablePagination, Divider
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { exportarRelatorioAFD, exportarRelatorioACJEF, listarCorrecoesApi, LogCorrecao } from '../services/api';
import { ExcelService } from '../services/excelService';

const RelatoriosLegaisPage: React.FC = () => {
  const [correcoes, setCorrecoes] = useState<LogCorrecao[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAFD, setLoadingAFD] = useState(false);
  const [loadingACJEF, setLoadingACJEF] = useState(false);
  const [loadingFinanceiro, setLoadingFinanceiro] = useState(false);
  const [loadingNaoConformidades, setLoadingNaoConformidades] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const carregarCorrecoes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listarCorrecoesApi({
        limite: rowsPerPage,
        offset: page * rowsPerPage
      });
      
      setCorrecoes(result.correcoes || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      setError('Erro ao carregar logs de correção: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, [rowsPerPage, page]);

  const handleExportarAFD = async () => {
    if (!dataInicio || !dataFim) {
      setError('Selecione as datas de início e fim');
      return;
    }

    setLoadingAFD(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await exportarRelatorioAFD(dataInicio, dataFim);
      setSuccess(result.message);
    } catch (err: any) {
      setError('Erro ao exportar AFD: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingAFD(false);
    }
  };

  const handleExportarACJEF = async () => {
    if (!dataInicio || !dataFim) {
      setError('Selecione as datas de início e fim');
      return;
    }

    setLoadingACJEF(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await exportarRelatorioACJEF(dataInicio, dataFim);
      setSuccess(result.message);
    } catch (err: any) {
      setError('Erro ao exportar ACJEF: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingACJEF(false);
    }
  };

  const handleExportarFinanceiro = async () => {
    setLoadingFinanceiro(true);
    setError(null);
    setSuccess(null);
    
    try {
      const periodo = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      await ExcelService.exportarRelatorioFinanceiro(periodo);
      setSuccess('Relatório financeiro exportado com sucesso!');
    } catch (err: any) {
      setError('Erro ao exportar relatório financeiro: ' + err.message);
    } finally {
      setLoadingFinanceiro(false);
    }
  };

  const handleExportarNaoConformidades = async () => {
    setLoadingNaoConformidades(true);
    setError(null);
    setSuccess(null);
    
    try {
      const periodo = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      await ExcelService.exportarNaoConformidades(periodo);
      setSuccess('Relatório de não conformidades exportado com sucesso!');
    } catch (err: any) {
      setError('Erro ao exportar relatório de não conformidades: ' + err.message);
    } finally {
      setLoadingNaoConformidades(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    carregarCorrecoes();
  }, [page, rowsPerPage]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Relatórios Legais e Conformidade</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Box sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>Exportar Relatórios</Typography>
        <Stack direction="row" spacing={2} mb={2}>
          <TextField
            label="Data Início"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="Data Fim"
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        </Stack>
        <Stack direction="row" spacing={2} mb={2}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleExportarAFD}
            disabled={loadingAFD}
            startIcon={loadingAFD ? <CircularProgress size={20} /> : null}
          >
            {loadingAFD ? 'Exportando...' : 'Exportar AFD (Portaria 671)'}
          </Button>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={handleExportarACJEF}
            disabled={loadingACJEF}
            startIcon={loadingACJEF ? <CircularProgress size={20} /> : null}
          >
            {loadingACJEF ? 'Exportando...' : 'Exportar ACJEF'}
          </Button>
        </Stack>
        
        <Divider sx={{ mb: 2 }} />
        
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          📊 Relatórios Excel Avançados - FG Services
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            color="success" 
            onClick={handleExportarFinanceiro}
            disabled={loadingFinanceiro}
            startIcon={loadingFinanceiro ? <CircularProgress size={20} /> : <AttachMoneyIcon />}
            sx={{ minWidth: 200 }}
          >
            {loadingFinanceiro ? 'Exportando...' : 'Relatório Financeiro'}
          </Button>
          <Button 
            variant="outlined" 
            color="warning" 
            onClick={handleExportarNaoConformidades}
            disabled={loadingNaoConformidades}
            startIcon={loadingNaoConformidades ? <CircularProgress size={20} /> : <ReportProblemIcon />}
            sx={{ minWidth: 200 }}
          >
            {loadingNaoConformidades ? 'Exportando...' : 'Não Conformidades'}
          </Button>
        </Stack>
      </Box>

      <Typography variant="h6" gutterBottom>Logs de Correção de Ponto</Typography>
      
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
                  <TableCell>Colaborador</TableCell>
                  <TableCell>Autor</TableCell>
                  <TableCell>Ação</TableCell>
                  <TableCell>Justificativa</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {correcoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Nenhuma correção encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  correcoes.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {new Date(item.data_correcao).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>{item.colaborador_nome}</TableCell>
                      <TableCell>{item.usuario_autor_nome}</TableCell>
                      <TableCell>
                        <Chip label={item.acao} color="info" size="small" />
                      </TableCell>
                      <TableCell>{item.justificativa}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
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
      
      <Typography variant="body1" color="text.secondary" sx={{ mt: 3 }}>
        <strong>Custódia de dados:</strong> Todos os registros de ponto e logs de correção são mantidos por no mínimo 5 anos, conforme Portaria 671/2021.
      </Typography>
    </Box>
  );
};

export default RelatoriosLegaisPage; 