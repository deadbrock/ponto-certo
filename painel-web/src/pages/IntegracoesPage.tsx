import React from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Stack, Link
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

interface Webhook {
  id: number;
  url: string;
  evento: string;
  ativo: boolean;
}

const IntegracoesPage: React.FC = () => {
  const [webhooks, setWebhooks] = React.useState<Webhook[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    carregarWebhooks();
  }, []);

  const carregarWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3333/api/integracoes/webhooks');
      
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks || []);
      } else {
        setWebhooks([]);
      }
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error);
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Integrações Externas</Typography>
      <Typography variant="h6" gutterBottom>API REST Pública</Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="body1">
          Endpoint principal: <b>https://api.seusistema.com/api/</b>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Documentação: <Link href="#" target="_blank">/api/docs</Link>
        </Typography>
        <Typography variant="subtitle2" sx={{ mt: 2 }}>Exemplo de uso:</Typography>
        <Box component="pre" bgcolor="#f5f5f5" p={2} borderRadius={2} mt={1}>
{`GET /api/ponto/historico?colaborador_id=123&data_inicio=2024-06-01&data_fim=2024-06-30
Authorization: Bearer <token>`}
        </Box>
      </Paper>
      <Typography variant="h6" gutterBottom>Webhooks Configurados</Typography>
      <Button variant="contained" color="primary" sx={{ mb: 2 }}>Adicionar Webhook</Button>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>URL</TableCell>
              <TableCell>Evento</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {webhooks.map((item: Webhook) => (
              <TableRow key={item.id}>
                <TableCell>{item.url}</TableCell>
                <TableCell>{item.evento}</TableCell>
                <TableCell>{item.ativo ? 'Ativo' : 'Inativo'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="h6" gutterBottom>Templates de Exportação</Typography>
      <Stack direction="row" spacing={2}>
        <Button variant="outlined" startIcon={<CloudDownloadIcon />}>Exportar para Domínio</Button>
        <Button variant="outlined" startIcon={<CloudDownloadIcon />}>Exportar para Thomson Reuters</Button>
        <Button variant="outlined" startIcon={<CloudDownloadIcon />}>Exportar CSV</Button>
      </Stack>
    </Box>
  );
};

export default IntegracoesPage; 