import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  NotificationsActive as NotificationIcon
} from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertaVigencia, Contrato } from '../../types/contratos';

interface AlertasVigenciaProps {
  alertas: AlertaVigencia[];
  onVerContrato?: (contratoId: string) => void;
  onMarcarVisualizado?: (alertaId: string) => void;
  compact?: boolean;
}

const AlertasVigencia: React.FC<AlertasVigenciaProps> = ({
  alertas,
  onVerContrato,
  onMarcarVisualizado,
  compact = false
}) => {
  const [expanded, setExpanded] = useState(!compact);
  const [selectedAlert, setSelectedAlert] = useState<AlertaVigencia | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Agrupar alertas por prioridade
  const alertasPorPrioridade = alertas.reduce((acc, alerta) => {
    if (!acc[alerta.prioridade]) {
      acc[alerta.prioridade] = [];
    }
    acc[alerta.prioridade].push(alerta);
    return acc;
  }, {} as Record<string, AlertaVigencia[]>);

  // Obter cor do alerta baseada na prioridade
  const getAlertColor = (prioridade: string) => {
    switch (prioridade) {
      case 'critica': return 'error';
      case 'alta': return 'error';
      case 'media': return 'warning';
      case 'baixa': return 'info';
      default: return 'warning';
    }
  };

  // Obter ícone do alerta
  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case 'vencido': return <ErrorIcon />;
      case 'vencimento_5': return <WarningIcon />;
      case 'vencimento_15': return <WarningIcon />;
      case 'vencimento_30': return <CalendarIcon />;
      default: return <WarningIcon />;
    }
  };

  // Obter texto do tipo de alerta
  const getTipoTexto = (tipo: string) => {
    switch (tipo) {
      case 'vencido': return 'Contrato Vencido';
      case 'vencimento_5': return 'Vence em 5 dias';
      case 'vencimento_15': return 'Vence em 15 dias';
      case 'vencimento_30': return 'Vence em 30 dias';
      default: return 'Alerta de Vigência';
    }
  };

  // Contar alertas não visualizados
  const alertasNaoVisualizados = alertas.filter(a => !a.visualizado).length;

  if (alertas.length === 0) {
    return null;
  }

  return (
    <Box>
      {/* Cabeçalho do componente */}
      <Alert
        severity={alertasPorPrioridade.critica?.length > 0 ? 'error' : 'warning'}
        action={
          <Box display="flex" alignItems="center" gap={1}>
            {alertasNaoVisualizados > 0 && (
              <Badge badgeContent={alertasNaoVisualizados} color="error">
                <NotificationIcon />
              </Badge>
            )}
            <IconButton
              color="inherit"
              size="small"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        }
      >
        <AlertTitle>
          Alertas de Vigência de Contratos
        </AlertTitle>
        {compact && (
          <Typography variant="body2">
            {alertas.length} alerta(s) • {alertasNaoVisualizados} não visualizado(s)
          </Typography>
        )}
      </Alert>

      {/* Lista detalhada de alertas */}
      <Collapse in={expanded}>
        <Box mt={2}>
          {/* Alertas Críticos */}
          {alertasPorPrioridade.critica && (
            <Box mb={2}>
              <Typography variant="h6" color="error.main" gutterBottom>
                🚨 Críticos ({alertasPorPrioridade.critica.length})
              </Typography>
              <List dense>
                {alertasPorPrioridade.critica.map((alerta) => (
                  <ListItem
                    key={alerta.id}
                    sx={{
                      bgcolor: 'error.50',
                      borderLeft: '4px solid',
                      borderLeftColor: 'error.main',
                      mb: 1,
                      borderRadius: 1
                    }}
                  >
                    <ListItemIcon>
                      {getAlertIcon(alerta.tipo)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1" fontWeight="bold">
                            {alerta.mensagem}
                          </Typography>
                          {!alerta.visualizado && (
                            <Chip
                              label="Novo"
                              size="small"
                              color="error"
                              variant="filled"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {getTipoTexto(alerta.tipo)} • {format(new Date(alerta.dataAlerta), 'dd/MM/yyyy HH:mm')}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Ver detalhes do contrato">
                          <IconButton
                            size="small"
                            onClick={() => onVerContrato?.(alerta.contratoId)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ver detalhes do alerta">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedAlert(alerta);
                              setShowDetails(true);
                            }}
                          >
                            <BusinessIcon />
                          </IconButton>
                        </Tooltip>
                        {!alerta.visualizado && (
                          <Tooltip title="Marcar como visualizado">
                            <IconButton
                              size="small"
                              onClick={() => onMarcarVisualizado?.(alerta.id)}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Alertas de Alta Prioridade */}
          {alertasPorPrioridade.alta && (
            <Box mb={2}>
              <Typography variant="h6" color="warning.main" gutterBottom>
                ⚠️ Alta Prioridade ({alertasPorPrioridade.alta.length})
              </Typography>
              <List dense>
                {alertasPorPrioridade.alta.map((alerta) => (
                  <ListItem
                    key={alerta.id}
                    sx={{
                      bgcolor: 'warning.50',
                      borderLeft: '4px solid',
                      borderLeftColor: 'warning.main',
                      mb: 1,
                      borderRadius: 1
                    }}
                  >
                    <ListItemIcon>
                      {getAlertIcon(alerta.tipo)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">
                            {alerta.mensagem}
                          </Typography>
                          {!alerta.visualizado && (
                            <Chip
                              label="Novo"
                              size="small"
                              color="warning"
                              variant="filled"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {getTipoTexto(alerta.tipo)} • {format(new Date(alerta.dataAlerta), 'dd/MM/yyyy HH:mm')}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          onClick={() => onVerContrato?.(alerta.contratoId)}
                        >
                          <ViewIcon />
                        </IconButton>
                        {!alerta.visualizado && (
                          <IconButton
                            size="small"
                            onClick={() => onMarcarVisualizado?.(alerta.id)}
                          >
                            <CloseIcon />
                          </IconButton>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Alertas de Média e Baixa Prioridade */}
          {(alertasPorPrioridade.media || alertasPorPrioridade.baixa) && (
            <Box>
              <Typography variant="h6" color="info.main" gutterBottom>
                ℹ️ Outros Alertas ({(alertasPorPrioridade.media?.length || 0) + (alertasPorPrioridade.baixa?.length || 0)})
              </Typography>
              <List dense>
                {[...(alertasPorPrioridade.media || []), ...(alertasPorPrioridade.baixa || [])].map((alerta) => (
                  <ListItem
                    key={alerta.id}
                    sx={{
                      bgcolor: 'info.50',
                      borderLeft: '3px solid',
                      borderLeftColor: 'info.main',
                      mb: 1,
                      borderRadius: 1
                    }}
                  >
                    <ListItemIcon>
                      {getAlertIcon(alerta.tipo)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">
                            {alerta.mensagem}
                          </Typography>
                          {!alerta.visualizado && (
                            <Chip
                              label="Novo"
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {getTipoTexto(alerta.tipo)} • {format(new Date(alerta.dataAlerta), 'dd/MM/yyyy HH:mm')}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => onVerContrato?.(alerta.contratoId)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Ações globais */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} pt={2} borderTop="1px solid #e0e0e0">
            <Typography variant="body2" color="text.secondary">
              Total: {alertas.length} alertas
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                size="small"
                onClick={() => {
                  alertas.filter(a => !a.visualizado).forEach(a => onMarcarVisualizado?.(a.id));
                }}
                disabled={alertasNaoVisualizados === 0}
              >
                Marcar Todos como Visualizados
              </Button>
            </Box>
          </Box>
        </Box>
      </Collapse>

      {/* Dialog de Detalhes do Alerta */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Detalhes do Alerta
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedAlert.mensagem}
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2} mt={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Tipo:
                  </Typography>
                  <Typography variant="body2">
                    {getTipoTexto(selectedAlert.tipo)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Prioridade:
                  </Typography>
                  <Chip
                    label={selectedAlert.prioridade.toUpperCase()}
                    color={getAlertColor(selectedAlert.prioridade) as any}
                    size="small"
                  />
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Data do Alerta:
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(selectedAlert.dataAlerta), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Status:
                  </Typography>
                  <Typography variant="body2">
                    {selectedAlert.visualizado ? 'Visualizado' : 'Não visualizado'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>
            Fechar
          </Button>
          {selectedAlert && !selectedAlert.visualizado && (
            <Button
              onClick={() => {
                onMarcarVisualizado?.(selectedAlert.id);
                setShowDetails(false);
              }}
              variant="contained"
            >
              Marcar como Visualizado
            </Button>
          )}
          {selectedAlert && (
            <Button
              onClick={() => {
                onVerContrato?.(selectedAlert.contratoId);
                setShowDetails(false);
              }}
              variant="contained"
              color="primary"
            >
              Ver Contrato
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertasVigencia; 