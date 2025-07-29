import React from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, TextField, MenuItem, Button, Avatar, Pagination, CircularProgress, Menu, Fab
} from '@mui/material';
import RoomIcon from '@mui/icons-material/Room';
import GetAppIcon from '@mui/icons-material/GetApp';
import TableViewIcon from '@mui/icons-material/TableView';
import PeopleIcon from '@mui/icons-material/People';
import { buscarRegistrosPontoApi } from '../services/api';
import { ExcelService, RegistroPonto as RegistroExcel, ColaboradorResumo } from '../services/excelService';

interface RegistroPonto {
  id: number;
  data: string;
  colaborador: { id: number; nome: string; cpf: string; unidade: string };
  tipo: string;
  foto: string;
  latitude: number;
  longitude: number;
}

// Função para formatar data DD/MM/AAAA HH:mm
function formatarData(dataStr: string) {
  const [date, time] = dataStr.split(' ');
  const [ano, mes, dia] = date.split('-');
  return `${dia}/${mes}/${ano} ${time}`;
}

const tipos = ['Entrada', 'Entrada_VI', 'Saída', 'Intervalo'];

const RegistrosPage: React.FC = () => {
  const [filtroColaborador, setFiltroColaborador] = React.useState('');
  const [filtroUnidade, setFiltroUnidade] = React.useState('');
  const [filtroTipo, setFiltroTipo] = React.useState('');
  const [pagina, setPagina] = React.useState(1);
  const [porPagina] = React.useState(10);
  const [registros, setRegistros] = React.useState<RegistroPonto[]>([]);
  const [totalPaginas, setTotalPaginas] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [menuExportacao, setMenuExportacao] = React.useState<null | HTMLElement>(null);
  const [loadingExport, setLoadingExport] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    buscarRegistrosPontoApi({
      page: pagina,
      limit: porPagina,
      search: filtroColaborador,
      unidade: filtroUnidade,
      tipo: filtroTipo,
    })
      .then(res => {
        setRegistros(res.registros || []);
        setTotalPaginas(res.pages || 1);
      })
      .finally(() => setLoading(false));
  }, [pagina, porPagina, filtroColaborador, filtroUnidade, filtroTipo]);

  // Funções de exportação Excel
  const exportarRegistrosDetalhados = async () => {
    setLoadingExport(true);
    try {
      // Buscar todos os registros para exportação
      const res = await buscarRegistrosPontoApi({
        page: 1,
        limit: 1000, // Buscar um grande número para pegar todos
        search: filtroColaborador,
        unidade: filtroUnidade,
        tipo: filtroTipo,
      });

      // Converter para formato do Excel
      const registrosExcel: RegistroExcel[] = res.registros.map((reg: RegistroPonto) => ({
        id: reg.id,
        colaborador: reg.colaborador.nome,
        equipe: reg.colaborador.unidade,
        cliente: reg.colaborador.unidade, // Adaptado para estrutura existente
        data: reg.data.split(' ')[0],
        entrada: reg.tipo === 'Entrada' || reg.tipo === 'Entrada_VI' ? reg.data.split(' ')[1] : '-',
        saida: reg.tipo === 'Saída' ? reg.data.split(' ')[1] : '-',
        almoco_saida: reg.tipo === 'Intervalo' ? reg.data.split(' ')[1] : undefined,
        almoco_retorno: undefined,
        horas_trabalhadas: 8, // Padrão de 8h - poderia ser calculado
        observacoes: `Tipo: ${reg.tipo}`
      }));

      const hoje = new Date();
      const mesAtual = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      await ExcelService.exportarRegistrosPonto(
        registrosExcel,
        {
          inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toLocaleDateString('pt-BR'),
          fim: hoje.toLocaleDateString('pt-BR')
        },
        {
          equipe: filtroUnidade || undefined,
          cliente: filtroUnidade || undefined
        }
      );
    } catch (error) {
      console.error('Erro ao exportar registros:', error);
    } finally {
      setLoadingExport(false);
      setMenuExportacao(null);
    }
  };

  const exportarRelatorioPresenca = async () => {
    setLoadingExport(true);
    try {
      // Buscar dados reais do backend
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'https://pontodigital-production.up.railway.app/api'}/relatorios/presenca-colaboradores`);
      
      let colaboradores: ColaboradorResumo[] = [];
      
      if (response.ok) {
        const data = await response.json();
        colaboradores = data.colaboradores || [];
      } else {
        console.warn('Erro ao carregar dados do backend, usando dados vazios');
      }

      const hoje = new Date();
      const mesAtual = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      await ExcelService.exportarRelatorioPresenca(colaboradores, mesAtual);
    } catch (error) {
      console.error('Erro ao exportar relatório de presença:', error);
    } finally {
      setLoadingExport(false);
      setMenuExportacao(null);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Registros de Ponto
      </Typography>
      <Typography variant="body1">
        Aqui você poderá visualizar, filtrar e exportar os registros de ponto dos colaboradores.
      </Typography>
      <Box display="flex" gap={2} mb={2}>
        <TextField
          label="Colaborador (nome ou CPF)"
          value={filtroColaborador}
          onChange={e => { setFiltroColaborador(e.target.value); setPagina(1); }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          label="Unidade"
          value={filtroUnidade}
          onChange={e => { setFiltroUnidade(e.target.value); setPagina(1); }}
          sx={{ minWidth: 140 }}
        />
        <TextField
          select
          label="Tipo"
          value={filtroTipo}
          onChange={e => { setFiltroTipo(e.target.value); setPagina(1); }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {tipos.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <Button variant="outlined" onClick={() => {
          setFiltroColaborador('');
          setFiltroUnidade('');
          setFiltroTipo('');
          setPagina(1);
        }}>Limpar Filtros</Button>
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
                <TableCell>Data/Hora</TableCell>
                <TableCell>Colaborador</TableCell>
                <TableCell>Unidade</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Foto</TableCell>
                <TableCell>Localização</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {registros.map(registro => (
                <TableRow key={registro.id}>
                  <TableCell>{formatarData(registro.data)}</TableCell>
                  <TableCell>{registro.colaborador.nome}</TableCell>
                  <TableCell>{registro.colaborador.unidade}</TableCell>
                  <TableCell>
                    <Chip label={registro.tipo} color={registro.tipo === 'Entrada' || registro.tipo === 'Entrada_VI' ? 'success' : registro.tipo === 'Saída' ? 'error' : 'info'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Avatar src={registro.foto} alt={registro.colaborador.nome} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<RoomIcon />}
                      href={`https://www.google.com/maps?q=${registro.latitude},${registro.longitude}`}
                      target="_blank"
                    >
                      Ver Mapa
                    </Button>
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
      
      {/* FAB para Exportação */}
      <Fab
        color="primary"
        aria-label="exportar"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={(event) => setMenuExportacao(event.currentTarget)}
        disabled={loadingExport}
      >
        {loadingExport ? <CircularProgress size={24} color="inherit" /> : <GetAppIcon />}
      </Fab>

      {/* Menu de Exportação */}
      <Menu
        anchorEl={menuExportacao}
        open={Boolean(menuExportacao)}
        onClose={() => setMenuExportacao(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MenuItem onClick={exportarRegistrosDetalhados}>
          <TableViewIcon sx={{ mr: 1 }} />
          Exportar Registros Detalhados
        </MenuItem>
        <MenuItem onClick={exportarRelatorioPresenca}>
          <PeopleIcon sx={{ mr: 1 }} />
          Exportar Relatório de Presença
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default RegistrosPage; 