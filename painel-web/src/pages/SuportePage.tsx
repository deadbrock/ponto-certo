import React from 'react';
import {
  Box, Typography, Button, Stack, TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import api from '../services/api';

interface Chamado {
  id: number;
  data: string;
  usuario: string;
  assunto: string;
  status: 'Aberto' | 'Em andamento' | 'Resolvido';
}

const SuportePage: React.FC = () => {
  const [assunto, setAssunto] = React.useState('');
  const [mensagem, setMensagem] = React.useState('');
  const [enviado, setEnviado] = React.useState(false);
  const [chamados, setChamados] = React.useState<Chamado[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    carregarChamados();
  }, []);

  const carregarChamados = async () => {
    try {
      setLoading(true);
      const response = await api.get('/suporte/chamados');
      setChamados(response.data.chamados || []);
    } catch (error) {
      console.error('Erro ao carregar chamados:', error);
      setChamados([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEnviar = async () => {
    if (!assunto || !mensagem) return;
    
    try {
      setEnviado(true);
      await api.post('/suporte/chamados', {
        assunto,
        mensagem
      });

      setAssunto('');
      setMensagem('');
      carregarChamados(); // Recarregar lista de chamados
      setTimeout(() => setEnviado(false), 2000);
    } catch (error) {
      console.error('Erro ao enviar chamado:', error);
      alert('Erro de conexão ao enviar chamado');
      setEnviado(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Suporte e Documentação</Typography>
      <Stack direction="row" spacing={2} mb={3}>
        <Button variant="outlined" startIcon={<DescriptionIcon />} href="#" target="_blank">
          Documentação Técnica
        </Button>
        <Button variant="outlined" startIcon={<HelpOutlineIcon />} href="#" target="_blank">
          Manual do Usuário
        </Button>
      </Stack>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Abrir Chamado de Suporte</Typography>
        <Stack spacing={2}>
          <TextField
            label="Assunto"
            value={assunto}
            onChange={e => setAssunto(e.target.value)}
            fullWidth
          />
          <TextField
            label="Mensagem"
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            fullWidth
            multiline
            minRows={3}
          />
          <Button variant="contained" color="primary" onClick={handleEnviar} disabled={enviado || !assunto || !mensagem}>
            {enviado ? 'Enviado!' : 'Enviar'}
          </Button>
        </Stack>
      </Paper>
      <Typography variant="h6" gutterBottom>Histórico de Chamados</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data/Hora</TableCell>
              <TableCell>Usuário</TableCell>
              <TableCell>Assunto</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {chamados.map((item: Chamado) => (
              <TableRow key={item.id}>
                <TableCell>{item.data}</TableCell>
                <TableCell>{item.usuario}</TableCell>
                <TableCell>{item.assunto}</TableCell>
                <TableCell>
                  <Chip label={item.status} color={item.status === 'Resolvido' ? 'success' : item.status === 'Aberto' ? 'warning' : 'info'} size="small" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SuportePage; 