import React from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress, Alert
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../services/api';

interface ResumoColaborador {
  id: number;
  nome: string;
  diasTrabalhados: number;
  horasTrabalhadas: number;
  horasExtras: number;
  horasDevedoras: number;
  faltas: number;
}

const FrequenciaPage: React.FC = () => {
  const [resumo, setResumo] = React.useState<ResumoColaborador[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    carregarResumoFrequencia();
  }, []);

  const carregarResumoFrequencia = async () => {
    try {
      setLoading(true);
      console.log('🔄 Carregando resumo de frequência...');
      
      const response = await api.get('/frequencia/resumo-mensal');
      console.log('✅ Dados recebidos:', response.data);
      
      if (response.data.success) {
        setResumo(response.data.resumo || []);
        setError(null);
      } else {
        setError('Erro ao carregar dados do servidor');
        setResumo([]);
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar resumo de frequência:', error);
      console.error('📋 Detalhes do erro:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      setError('Erro de conexão com o servidor');
      setResumo([]);
    } finally {
      setLoading(false);
    }
  };

  const exportarRelatorio = async () => {
    try {
      // Implementar exportação com dados reais
      console.log('Exportando relatório de frequência...');
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando dados...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Resumo Mensal de Frequência</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button variant="outlined" onClick={exportarRelatorio} sx={{ mb: 2 }}>
        Exportar PDF/Excel
      </Button>

      {resumo.length === 0 ? (
        <Alert severity="info">
          Nenhum dado de frequência disponível para o período atual.
        </Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Colaborador</TableCell>
                  <TableCell>Dias Trabalhados</TableCell>
                  <TableCell>Horas Trabalhadas</TableCell>
                  <TableCell>Horas Extras</TableCell>
                  <TableCell>Horas Devedoras</TableCell>
                  <TableCell>Faltas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resumo.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.nome}</TableCell>
                    <TableCell>{item.diasTrabalhados}</TableCell>
                    <TableCell>{item.horasTrabalhadas}</TableCell>
                    <TableCell>{item.horasExtras}</TableCell>
                    <TableCell>{item.horasDevedoras}</TableCell>
                    <TableCell>{item.faltas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom>Gráfico de Horas Trabalhadas e Extras</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={resumo} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="horasTrabalhadas" fill="#1976d2" name="Horas Trabalhadas" />
              <Bar dataKey="horasExtras" fill="#43a047" name="Horas Extras" />
              <Bar dataKey="horasDevedoras" fill="#e53935" name="Horas Devedoras" />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </Box>
  );
};

export default FrequenciaPage; 