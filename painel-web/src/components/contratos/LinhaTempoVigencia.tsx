import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  Grid,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Today as TodayIcon,
  Flag as EndIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { format, differenceInDays, differenceInCalendarDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Contrato } from '../../types/contratos';

interface LinhaTempoVigenciaProps {
  contrato: Contrato;
  showDetails?: boolean;
  compact?: boolean;
}

const LinhaTempoVigencia: React.FC<LinhaTempoVigenciaProps> = ({
  contrato,
  showDetails = true,
  compact = false
}) => {
  const theme = useTheme();

  // Calcular dados da vigência
  const hoje = new Date();
  const inicioVigencia = new Date(contrato.vigenciaInicio);
  const fimVigencia = new Date(contrato.vigenciaFim);
  
  const totalDias = differenceInCalendarDays(fimVigencia, inicioVigencia);
  const diasPassados = differenceInCalendarDays(hoje, inicioVigencia);
  const diasRestantes = differenceInCalendarDays(fimVigencia, hoje);
  
  const progresso = Math.min(Math.max((diasPassados / totalDias) * 100, 0), 100);
  
  // Determinar status e cor
  const getStatusInfo = () => {
    if (diasRestantes < 0) {
      return {
        status: 'Vencido',
        color: 'error',
        icon: <ErrorIcon />,
        bgColor: theme.palette.error.light,
        textColor: theme.palette.error.contrastText
      };
    } else if (diasRestantes <= 5) {
      return {
        status: 'Crítico - 5 dias',
        color: 'error',
        icon: <WarningIcon />,
        bgColor: theme.palette.error.light,
        textColor: theme.palette.error.contrastText
      };
    } else if (diasRestantes <= 15) {
      return {
        status: 'Atenção - 15 dias',
        color: 'warning',
        icon: <WarningIcon />,
        bgColor: theme.palette.warning.light,
        textColor: theme.palette.warning.contrastText
      };
    } else if (diasRestantes <= 30) {
      return {
        status: 'Próximo do vencimento',
        color: 'warning',
        icon: <WarningIcon />,
        bgColor: theme.palette.warning.light,
        textColor: theme.palette.warning.contrastText
      };
    } else {
      return {
        status: 'Ativo',
        color: 'success',
        icon: <CheckIcon />,
        bgColor: theme.palette.success.light,
        textColor: theme.palette.success.contrastText
      };
    }
  };

  const statusInfo = getStatusInfo();

  // Calcular marcos importantes
  const marcos = [
    {
      label: 'Início',
      date: inicioVigencia,
      position: 0,
      icon: <StartIcon />,
      color: theme.palette.primary.main,
      passed: true
    },
    {
      label: 'Hoje',
      date: hoje,
      position: progresso,
      icon: <TodayIcon />,
      color: theme.palette.info.main,
      passed: false,
      current: true
    },
    {
      label: 'Fim',
      date: fimVigencia,
      position: 100,
      icon: <EndIcon />,
      color: statusInfo.color === 'error' ? theme.palette.error.main : theme.palette.grey[600],
      passed: diasRestantes < 0
    }
  ];

  // Adicionar marcos de alerta se necessário
  if (diasRestantes > 30) {
    const data30Dias = addDays(fimVigencia, -30);
    const posicao30Dias = Math.min(Math.max(((differenceInCalendarDays(data30Dias, inicioVigencia) / totalDias) * 100), 0), 100);
    
    marcos.splice(-1, 0, {
      label: '30 dias',
      date: data30Dias,
      position: posicao30Dias,
      icon: <WarningIcon />,
      color: theme.palette.warning.main,
      passed: differenceInCalendarDays(hoje, data30Dias) >= 0
    });
  }

  if (compact) {
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" fontWeight="medium">
            Vigência do Contrato
          </Typography>
          <Chip
            label={statusInfo.status}
            color={statusInfo.color as any}
            size="small"
            icon={statusInfo.icon}
          />
        </Box>
        <LinearProgress
          variant="determinate"
          value={progresso}
          color={statusInfo.color as any}
          sx={{ height: 8, borderRadius: 4 }}
        />
        <Box display="flex" justifyContent="space-between" mt={1}>
          <Typography variant="caption" color="text.secondary">
            {format(inicioVigencia, 'dd/MM/yy')}
          </Typography>
          <Typography variant="caption" color={diasRestantes < 30 ? statusInfo.color + '.main' : 'text.secondary'}>
            {diasRestantes > 0 ? `${diasRestantes} dias restantes` : 'Vencido'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {format(fimVigencia, 'dd/MM/yy')}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Cabeçalho */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">
            Linha do Tempo da Vigência
          </Typography>
          <Chip
            label={statusInfo.status}
            color={statusInfo.color as any}
            icon={statusInfo.icon}
            sx={{ 
              fontWeight: 'bold',
              '& .MuiChip-icon': { color: 'inherit' }
            }}
          />
        </Box>

        {/* Estatísticas principais */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={4}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                {totalDias}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dias Totais
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main" fontWeight="bold">
                {Math.max(diasPassados, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dias Decorridos
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box textAlign="center">
              <Typography 
                variant="h4" 
                color={diasRestantes < 30 ? statusInfo.color + '.main' : 'success.main'}
                fontWeight="bold"
              >
                {Math.max(diasRestantes, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dias Restantes
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Barra de progresso principal */}
        <Box mb={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Progresso da Vigência
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {progresso.toFixed(1)}% concluído
            </Typography>
          </Box>
          
          <Box position="relative">
            <LinearProgress
              variant="determinate"
              value={progresso}
              color={statusInfo.color as any}
              sx={{ 
                height: 12, 
                borderRadius: 6,
                bgcolor: theme.palette.grey[200]
              }}
            />
            
            {/* Marcos na linha do tempo */}
            {marcos.map((marco, index) => (
              <Tooltip
                key={index}
                title={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {marco.label}
                    </Typography>
                    <Typography variant="caption">
                      {format(marco.date, 'dd/MM/yyyy', { locale: ptBR })}
                    </Typography>
                    {marco.current && (
                      <Typography variant="caption" display="block">
                        Hoje
                      </Typography>
                    )}
                  </Box>
                }
                arrow
              >
                <Box
                  position="absolute"
                  top="-8px"
                  left={`${marco.position}%`}
                  sx={{
                    transform: 'translateX(-50%)',
                    zIndex: 2,
                    cursor: 'pointer'
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: marco.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      border: `3px solid ${theme.palette.background.paper}`,
                      boxShadow: theme.shadows[2],
                      '&:hover': {
                        transform: 'scale(1.1)',
                        transition: 'transform 0.2s'
                      }
                    }}
                  >
                    {marco.icon}
                  </Box>
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Box>

        {/* Detalhes das datas */}
        {showDetails && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Detalhes da Vigência
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box p={2} bgcolor="grey.50" borderRadius={1}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Data de Início
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {format(inicioVigencia, 'dd \'de\' MMMM \'de\' yyyy', { locale: ptBR })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(inicioVigencia, 'EEEE', { locale: ptBR })}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box 
                  p={2} 
                  bgcolor={statusInfo.color === 'error' ? 'error.50' : 'grey.50'} 
                  borderRadius={1}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Data de Término
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {format(fimVigencia, 'dd \'de\' MMMM \'de\' yyyy', { locale: ptBR })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(fimVigencia, 'EEEE', { locale: ptBR })}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Alertas de vencimento */}
            {diasRestantes <= 30 && diasRestantes > 0 && (
              <Box mt={2} p={2} bgcolor="warning.50" borderRadius={1} border="1px solid" borderColor="warning.main">
                <Box display="flex" alignItems="center" gap={1}>
                  <WarningIcon color="warning" />
                  <Typography variant="body2" fontWeight="medium" color="warning.dark">
                    Atenção: Contrato próximo do vencimento
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Este contrato vencerá em {diasRestantes} dia(s). Considere iniciar o processo de renovação ou encerramento.
                </Typography>
              </Box>
            )}

            {diasRestantes < 0 && (
              <Box mt={2} p={2} bgcolor="error.50" borderRadius={1} border="1px solid" borderColor="error.main">
                <Box display="flex" alignItems="center" gap={1}>
                  <ErrorIcon color="error" />
                  <Typography variant="body2" fontWeight="medium" color="error.dark">
                    Contrato Vencido
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Este contrato venceu há {Math.abs(diasRestantes)} dia(s). Ação imediata necessária.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LinhaTempoVigencia; 