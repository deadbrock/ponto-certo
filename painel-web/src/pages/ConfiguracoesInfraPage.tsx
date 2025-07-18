import React from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField, Stack, Chip
} from '@mui/material';
import BackupIcon from '@mui/icons-material/Backup';
import DevicesIcon from '@mui/icons-material/Devices';
import SyncIcon from '@mui/icons-material/Sync';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Dispositivo {
  id: string;
  nome: string;
  local: string;
  status: 'Online' | 'Offline';
  ultimaSync: string;
}

const ConfiguracoesInfraPage: React.FC = () => {
  const [emailSuporte, setEmailSuporte] = React.useState('suporte@empresa.com');
  const [tempoSync, setTempoSync] = React.useState(15);
  const [dispositivos, setDispositivos] = React.useState<Dispositivo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    carregarDispositivos();
  }, []);

  const carregarDispositivos = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3333/api/configuracoes/dispositivos');
      
      if (response.ok) {
        const data = await response.json();
        setDispositivos(data.dispositivos || []);
        setError(null);
      } else {
        setError('Erro ao carregar dados do servidor');
        setDispositivos([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error);
      setError('Erro de conexão com o servidor');
      setDispositivos([]);
    } finally {
      setLoading(false);
    }
  };

  const realizarBackup = async () => {
    try {
      const response = await fetch('http://localhost:3333/api/configuracoes/backup', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Backup realizado com sucesso!');
      } else {
        alert('Erro ao realizar backup');
      }
    } catch (error) {
      console.error('Erro ao realizar backup:', error);
      alert('Erro de conexão ao realizar backup');
    }
  };

  const agendarBackup = async () => {
    try {
      const response = await fetch('http://localhost:3333/api/configuracoes/backup/agendar', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Backup agendado com sucesso!');
      } else {
        alert('Erro ao agendar backup');
      }
    } catch (error) {
      console.error('Erro ao agendar backup:', error);
      alert('Erro de conexão ao agendar backup');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Configurações e Infraestrutura</Typography>
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Dispositivos Registrados</Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Local</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Última Sincronização</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dispositivos.map((item: Dispositivo) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell>{item.nome}</TableCell>
                <TableCell>{item.local}</TableCell>
                <TableCell>
                  <Chip label={item.status} color={item.status === 'Online' ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell>{item.ultimaSync}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack direction="row" spacing={2} mb={4}>
        <Button variant="contained" startIcon={<BackupIcon />} onClick={realizarBackup}>
          Backup Manual
        </Button>
        <Button variant="outlined" startIcon={<BackupIcon />} onClick={agendarBackup}>
          Agendar Backup
        </Button>
      </Stack>
      <Typography variant="h6" gutterBottom>Configurações Gerais</Typography>
      <Stack direction="row" spacing={2} mb={4}>
        <TextField
          label="E-mail de Suporte"
          value={emailSuporte}
          onChange={e => setEmailSuporte(e.target.value)}
          sx={{ minWidth: 300 }}
        />
        <TextField
          label="Tempo de Sincronização (min)"
          type="number"
          value={tempoSync}
          onChange={e => setTempoSync(Number(e.target.value))}
          sx={{ minWidth: 200 }}
        />
      </Stack>
      <Typography variant="h6" gutterBottom>Monitoramento</Typography>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack direction="row" spacing={4}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <SyncIcon color="success" />
              <Typography variant="subtitle2">Sincronização</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">Última: 19/06/2024 09:00</Typography>
            <Typography variant="body2" color="text.secondary">Status: OK</Typography>
          </Box>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ErrorOutlineIcon color="error" />
              <Typography variant="subtitle2">Falhas Recentes</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">Nenhuma falha nas últimas 24h</Typography>
          </Box>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <DevicesIcon color="primary" />
              <Typography variant="subtitle2">Uptime</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">99.98% (últimos 30 dias)</Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ConfiguracoesInfraPage; 