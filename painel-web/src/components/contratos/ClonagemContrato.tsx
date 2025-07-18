import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Grid,
  Typography,
  Box,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Description as DocumentIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addYears, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Contrato } from '../../types/contratos';

interface ClonagemContratoProps {
  open: boolean;
  contrato: Contrato | null;
  onClose: () => void;
  onClonar: (dadosClonagem: DadosClonagem) => Promise<void>;
}

interface DadosClonagem {
  contratoOriginalId: string;
  nome: string;
  cliente: string;
  localizacao: string;
  valor: number;
  vigenciaInicio: Date | null;
  vigenciaFim: Date | null;
  responsavel?: string;
  numeroContrato?: string;
  descricao?: string;
  
  // Opções de clonagem
  clonarColaboradores: boolean;
  clonarDocumentos: boolean;
  manterHistorico: boolean;
  criarNovaVigencia: boolean;
  duracaoVigencia: number; // em meses
}

const ClonagemContrato: React.FC<ClonagemContratoProps> = ({
  open,
  contrato,
  onClose,
  onClonar
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dadosClonagem, setDadosClonagem] = useState<Partial<DadosClonagem>>({});

  // Inicializar dados quando o contrato for selecionado
  React.useEffect(() => {
    if (contrato) {
      const novaVigenciaInicio = new Date();
      const novaVigenciaFim = addYears(novaVigenciaInicio, 1);

      setDadosClonagem({
        contratoOriginalId: contrato.id,
        nome: `${contrato.nome} - Cópia`,
        cliente: contrato.cliente,
        localizacao: contrato.localizacao,
        valor: contrato.valor,
        vigenciaInicio: novaVigenciaInicio,
        vigenciaFim: novaVigenciaFim,
        responsavel: contrato.responsavel,
        numeroContrato: '',
        descricao: contrato.descricao,
        
        // Opções padrão
        clonarColaboradores: false,
        clonarDocumentos: true,
        manterHistorico: false,
        criarNovaVigencia: true,
        duracaoVigencia: 12
      });
    }
  }, [contrato]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleDuracaoChange = (duracao: number) => {
    if (dadosClonagem.vigenciaInicio) {
      const novaVigenciaFim = addMonths(dadosClonagem.vigenciaInicio, duracao);
      setDadosClonagem({
        ...dadosClonagem,
        duracaoVigencia: duracao,
        vigenciaFim: novaVigenciaFim
      });
    }
  };

  const handleClonar = async () => {
    if (!dadosClonagem.contratoOriginalId || !dadosClonagem.nome) return;

    try {
      setLoading(true);
      await onClonar(dadosClonagem as DadosClonagem);
      onClose();
      setActiveStep(0);
      setDadosClonagem({});
    } catch (error) {
      console.error('Erro ao clonar contrato:', error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      label: 'Dados Básicos',
      description: 'Configure as informações principais do novo contrato',
    },
    {
      label: 'Vigência',
      description: 'Defina o período de validade do contrato',
    },
    {
      label: 'Opções de Clonagem',
      description: 'Escolha quais elementos serão copiados',
    },
    {
      label: 'Revisão',
      description: 'Confirme as configurações antes de criar',
    },
  ];

  if (!contrato) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 600 }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <CopyIcon color="primary" />
          <Box>
            <Typography variant="h6">
              Clonar Contrato
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {contrato.nome}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>
                  <Typography variant="subtitle1">{step.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepLabel>
                <StepContent>
                  {/* Passo 1: Dados Básicos */}
                  {index === 0 && (
                    <Box mt={2}>
                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <TextField
                            label="Nome do Novo Contrato"
                            fullWidth
                            value={dadosClonagem.nome || ''}
                            onChange={(e) => setDadosClonagem({
                              ...dadosClonagem,
                              nome: e.target.value
                            })}
                            required
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Cliente"
                            fullWidth
                            value={dadosClonagem.cliente || ''}
                            onChange={(e) => setDadosClonagem({
                              ...dadosClonagem,
                              cliente: e.target.value
                            })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Localização"
                            fullWidth
                            value={dadosClonagem.localizacao || ''}
                            onChange={(e) => setDadosClonagem({
                              ...dadosClonagem,
                              localizacao: e.target.value
                            })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Valor do Contrato"
                            fullWidth
                            type="number"
                            value={dadosClonagem.valor || 0}
                            onChange={(e) => setDadosClonagem({
                              ...dadosClonagem,
                              valor: parseFloat(e.target.value) || 0
                            })}
                            InputProps={{
                              startAdornment: 'R$ '
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Responsável"
                            fullWidth
                            value={dadosClonagem.responsavel || ''}
                            onChange={(e) => setDadosClonagem({
                              ...dadosClonagem,
                              responsavel: e.target.value
                            })}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Número do Contrato"
                            fullWidth
                            value={dadosClonagem.numeroContrato || ''}
                            onChange={(e) => setDadosClonagem({
                              ...dadosClonagem,
                              numeroContrato: e.target.value
                            })}
                            helperText="Deixe em branco para gerar automaticamente"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* Passo 2: Vigência */}
                  {index === 1 && (
                    <Box mt={2}>
                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <FormControl fullWidth>
                            <InputLabel>Duração da Vigência</InputLabel>
                            <Select
                              value={dadosClonagem.duracaoVigencia || 12}
                              label="Duração da Vigência"
                              onChange={(e) => handleDuracaoChange(e.target.value as number)}
                            >
                              <MenuItem value={6}>6 meses</MenuItem>
                              <MenuItem value={12}>1 ano</MenuItem>
                              <MenuItem value={18}>1 ano e 6 meses</MenuItem>
                              <MenuItem value={24}>2 anos</MenuItem>
                              <MenuItem value={36}>3 anos</MenuItem>
                              <MenuItem value={0}>Personalizado</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <DatePicker
                            label="Data de Início"
                            value={dadosClonagem.vigenciaInicio}
                            onChange={(date: Date | null) => {
                              if (date) {
                                const novaVigenciaFim = dadosClonagem.duracaoVigencia 
                                  ? addMonths(date, dadosClonagem.duracaoVigencia)
                                  : dadosClonagem.vigenciaFim;
                                
                                setDadosClonagem({
                                  ...dadosClonagem,
                                  vigenciaInicio: date,
                                  vigenciaFim: novaVigenciaFim
                                });
                              }
                            }}
                            slotProps={{
                              textField: {
                                fullWidth: true
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <DatePicker
                            label="Data de Fim"
                            value={dadosClonagem.vigenciaFim}
                            onChange={(date: Date | null) => {
                              if (date) {
                                setDadosClonagem({
                                  ...dadosClonagem,
                                  vigenciaFim: date
                                });
                              }
                            }}
                            slotProps={{
                              textField: {
                                fullWidth: true
                              }
                            }}
                          />
                        </Grid>
                      </Grid>

                      {dadosClonagem.vigenciaInicio && dadosClonagem.vigenciaFim && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            <strong>Período:</strong> {format(dadosClonagem.vigenciaInicio, 'dd/MM/yyyy')} até {format(dadosClonagem.vigenciaFim, 'dd/MM/yyyy')}
                            <br />
                            <strong>Duração:</strong> {Math.ceil((dadosClonagem.vigenciaFim.getTime() - dadosClonagem.vigenciaInicio.getTime()) / (1000 * 60 * 60 * 24))} dias
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  )}

                  {/* Passo 3: Opções de Clonagem */}
                  {index === 2 && (
                    <Box mt={2}>
                      <Typography variant="subtitle1" gutterBottom>
                        Escolha quais elementos deseja copiar do contrato original:
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={dadosClonagem.clonarColaboradores || false}
                                onChange={(e) => setDadosClonagem({
                                  ...dadosClonagem,
                                  clonarColaboradores: e.target.checked
                                })}
                              />
                            }
                            label={
                              <Box display="flex" alignItems="center" gap={1}>
                                <PeopleIcon fontSize="small" />
                                <Box>
                                  <Typography variant="body2">
                                    Quadro Funcional ({contrato.colaboradores.length} colaboradores)
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Copia todos os colaboradores vinculados ao contrato
                                  </Typography>
                                </Box>
                              </Box>
                            }
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={dadosClonagem.clonarDocumentos || false}
                                onChange={(e) => setDadosClonagem({
                                  ...dadosClonagem,
                                  clonarDocumentos: e.target.checked
                                })}
                              />
                            }
                            label={
                              <Box display="flex" alignItems="center" gap={1}>
                                <DocumentIcon fontSize="small" />
                                <Box>
                                  <Typography variant="body2">
                                    Documentos ({contrato.documentos.length} arquivos)
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Copia referências dos documentos (não duplica os arquivos)
                                  </Typography>
                                </Box>
                              </Box>
                            }
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={dadosClonagem.manterHistorico || false}
                                onChange={(e) => setDadosClonagem({
                                  ...dadosClonagem,
                                  manterHistorico: e.target.checked
                                })}
                              />
                            }
                            label={
                              <Box display="flex" alignItems="center" gap={1}>
                                <SettingsIcon fontSize="small" />
                                <Box>
                                  <Typography variant="body2">
                                    Histórico de Alterações
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Mantém o histórico do contrato original (recomendado: desabilitado)
                                  </Typography>
                                </Box>
                              </Box>
                            }
                          />
                        </Grid>
                      </Grid>

                      <Alert severity="warning" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Atenção:</strong> Colaboradores e documentos clonados manterão referência ao contrato original. 
                          Certifique-se de revisar e ajustar conforme necessário.
                        </Typography>
                      </Alert>
                    </Box>
                  )}

                  {/* Passo 4: Revisão */}
                  {index === 3 && (
                    <Box mt={2}>
                      <Typography variant="subtitle1" gutterBottom>
                        Revise as configurações do novo contrato:
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box p={2} bgcolor="grey.50" borderRadius={1}>
                            <Typography variant="h6" gutterBottom>
                              {dadosClonagem.nome}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {dadosClonagem.cliente} • {dadosClonagem.localizacao}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Valor:</strong> {dadosClonagem.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Vigência:</strong> {dadosClonagem.vigenciaInicio && format(dadosClonagem.vigenciaInicio, 'dd/MM/yyyy')} até {dadosClonagem.vigenciaFim && format(dadosClonagem.vigenciaFim, 'dd/MM/yyyy')}
                            </Typography>
                            {dadosClonagem.responsavel && (
                              <Typography variant="body2">
                                <strong>Responsável:</strong> {dadosClonagem.responsavel}
                              </Typography>
                            )}
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>
                            Elementos que serão clonados:
                          </Typography>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            {dadosClonagem.clonarColaboradores && (
                              <Chip
                                icon={<PeopleIcon />}
                                label={`${contrato.colaboradores.length} Colaboradores`}
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            {dadosClonagem.clonarDocumentos && (
                              <Chip
                                icon={<DocumentIcon />}
                                label={`${contrato.documentos.length} Documentos`}
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            {dadosClonagem.manterHistorico && (
                              <Chip
                                icon={<SettingsIcon />}
                                label="Histórico"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            {!dadosClonagem.clonarColaboradores && !dadosClonagem.clonarDocumentos && !dadosClonagem.manterHistorico && (
                              <Chip
                                label="Apenas dados básicos"
                                color="default"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  <Box sx={{ mb: 2, mt: 3 }}>
                    <div>
                      <Button
                        variant="contained"
                        onClick={index === steps.length - 1 ? handleClonar : handleNext}
                        sx={{ mt: 1, mr: 1 }}
                        disabled={loading || (index === 0 && !dadosClonagem.nome)}
                      >
                        {index === steps.length - 1 ? 'Clonar Contrato' : 'Continuar'}
                      </Button>
                      <Button
                        disabled={index === 0}
                        onClick={handleBack}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Voltar
                      </Button>
                    </div>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClonagemContrato; 