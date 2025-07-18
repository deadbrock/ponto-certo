import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
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
  InputAdornment,
  Divider
} from '@mui/material';
import {
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  DateRange as DateIcon,
  Description as DescriptionIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DadosContrato {
  nome: string;
  cliente: string;
  localizacao: string;
  valor: number;
  vigenciaInicio: Date;
  vigenciaFim: Date;
  status: 'Ativo' | 'Vencido' | 'Próximo do vencimento';
  descricao: string;
  responsavel: string;
  numeroContrato: string;
  objeto: string;
  coordenadasLatitude?: number;
  coordenadasLongitude?: number;
}

interface CriacaoContratoProps {
  open: boolean;
  onClose: () => void;
  onCriar: (dados: DadosContrato) => Promise<void>;
}

const CriacaoContrato: React.FC<CriacaoContratoProps> = ({
  open,
  onClose,
  onCriar
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [dadosContrato, setDadosContrato] = useState<Partial<DadosContrato>>({
    nome: '',
    cliente: '',
    localizacao: '',
    valor: 0,
    vigenciaInicio: new Date(),
    vigenciaFim: addMonths(new Date(), 12),
    status: 'Ativo',
    descricao: '',
    responsavel: '',
    numeroContrato: '',
    objeto: ''
  });

  const steps = [
    'Dados Básicos',
    'Informações Contratuais',
    'Vigência e Valor',
    'Revisão'
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Dados Básicos
        if (!dadosContrato.nome?.trim()) {
          newErrors.nome = 'Nome do contrato é obrigatório';
        }
        if (!dadosContrato.cliente?.trim()) {
          newErrors.cliente = 'Cliente é obrigatório';
        }
        if (!dadosContrato.localizacao?.trim()) {
          newErrors.localizacao = 'Localização é obrigatória';
        }
        break;

      case 1: // Informações Contratuais
        if (!dadosContrato.numeroContrato?.trim()) {
          newErrors.numeroContrato = 'Número do contrato é obrigatório';
        }
        if (!dadosContrato.objeto?.trim()) {
          newErrors.objeto = 'Objeto do contrato é obrigatório';
        }
        break;

      case 2: // Vigência e Valor
        if (!dadosContrato.vigenciaInicio) {
          newErrors.vigenciaInicio = 'Data de início é obrigatória';
        }
        if (!dadosContrato.vigenciaFim) {
          newErrors.vigenciaFim = 'Data de fim é obrigatória';
        }
        if (dadosContrato.vigenciaInicio && dadosContrato.vigenciaFim) {
          if (dadosContrato.vigenciaFim <= dadosContrato.vigenciaInicio) {
            newErrors.vigenciaFim = 'Data de fim deve ser posterior à data de início';
          }
        }
        if (!dadosContrato.valor || dadosContrato.valor <= 0) {
          newErrors.valor = 'Valor deve ser maior que zero';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    if (validateStep(2)) { // Validar todos os campos obrigatórios
      try {
        setLoading(true);
        await onCriar(dadosContrato as DadosContrato);
        handleClose();
      } catch (error) {
        console.error('Erro ao criar contrato:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setDadosContrato({
      nome: '',
      cliente: '',
      localizacao: '',
      valor: 0,
      vigenciaInicio: new Date(),
      vigenciaFim: addMonths(new Date(), 12),
      status: 'Ativo',
      descricao: '',
      responsavel: '',
      numeroContrato: '',
      objeto: ''
    });
    setErrors({});
    onClose();
  };

  const updateField = (field: keyof DadosContrato, value: any) => {
    setDadosContrato(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo ao editá-lo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Dados Básicos
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Nome do Contrato"
                fullWidth
                required
                value={dadosContrato.nome || ''}
                onChange={(e) => updateField('nome', e.target.value)}
                error={!!errors.nome}
                helperText={errors.nome}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="Ex: Contrato de Limpeza - Shopping ABC"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Cliente"
                fullWidth
                required
                value={dadosContrato.cliente || ''}
                onChange={(e) => updateField('cliente', e.target.value)}
                error={!!errors.cliente}
                helperText={errors.cliente}
                placeholder="Ex: Grupo ABC Ltda"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Localização"
                fullWidth
                required
                value={dadosContrato.localizacao || ''}
                onChange={(e) => updateField('localizacao', e.target.value)}
                error={!!errors.localizacao}
                helperText={errors.localizacao}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="Ex: São Paulo, SP"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Responsável"
                fullWidth
                value={dadosContrato.responsavel || ''}
                onChange={(e) => updateField('responsavel', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="Ex: João Silva"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Descrição"
                fullWidth
                multiline
                rows={3}
                value={dadosContrato.descricao || ''}
                onChange={(e) => updateField('descricao', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DescriptionIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="Descreva brevemente os serviços contratados..."
              />
            </Grid>
          </Grid>
        );

      case 1: // Informações Contratuais
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Número do Contrato"
                fullWidth
                required
                value={dadosContrato.numeroContrato || ''}
                onChange={(e) => updateField('numeroContrato', e.target.value)}
                error={!!errors.numeroContrato}
                helperText={errors.numeroContrato}
                placeholder="Ex: CT-2024-001"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={dadosContrato.status || 'Ativo'}
                  label="Status"
                  onChange={(e) => updateField('status', e.target.value)}
                >
                  <MenuItem value="Ativo">Ativo</MenuItem>
                  <MenuItem value="Próximo do vencimento">Próximo do vencimento</MenuItem>
                  <MenuItem value="Vencido">Vencido</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Objeto do Contrato"
                fullWidth
                required
                multiline
                rows={4}
                value={dadosContrato.objeto || ''}
                onChange={(e) => updateField('objeto', e.target.value)}
                error={!!errors.objeto}
                helperText={errors.objeto}
                placeholder="Descreva detalhadamente o objeto/escopo do contrato..."
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                <strong>Coordenadas GPS (Opcional)</strong> - Para localização no mapa
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Latitude"
                fullWidth
                type="number"
                value={dadosContrato.coordenadasLatitude || ''}
                onChange={(e) => updateField('coordenadasLatitude', parseFloat(e.target.value))}
                placeholder="Ex: -23.5505"
                inputProps={{ step: 'any' }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Longitude"
                fullWidth
                type="number"
                value={dadosContrato.coordenadasLongitude || ''}
                onChange={(e) => updateField('coordenadasLongitude', parseFloat(e.target.value))}
                placeholder="Ex: -46.6333"
                inputProps={{ step: 'any' }}
              />
            </Grid>
          </Grid>
        );

      case 2: // Vigência e Valor
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Data de Início"
                fullWidth
                required
                type="date"
                value={dadosContrato.vigenciaInicio ? format(dadosContrato.vigenciaInicio, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => updateField('vigenciaInicio', new Date(e.target.value))}
                error={!!errors.vigenciaInicio}
                helperText={errors.vigenciaInicio}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateIcon />
                    </InputAdornment>
                  ),
                }}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Data de Fim"
                fullWidth
                required
                type="date"
                value={dadosContrato.vigenciaFim ? format(dadosContrato.vigenciaFim, 'yyyy-MM-dd') : format(addMonths(new Date(), 12), 'yyyy-MM-dd')}
                onChange={(e) => updateField('vigenciaFim', new Date(e.target.value))}
                error={!!errors.vigenciaFim}
                helperText={errors.vigenciaFim}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateIcon />
                    </InputAdornment>
                  ),
                }}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Valor Mensal do Contrato"
                fullWidth
                required
                type="number"
                value={dadosContrato.valor || ''}
                onChange={(e) => updateField('valor', parseFloat(e.target.value) || 0)}
                error={!!errors.valor}
                helperText={errors.valor}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon />
                      R$
                    </InputAdornment>
                  ),
                }}
                inputProps={{ min: 0, step: 0.01 }}
                placeholder="0,00"
              />
            </Grid>

            {dadosContrato.vigenciaInicio && dadosContrato.vigenciaFim && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Duração do contrato:</strong> {
                      Math.ceil(
                        (dadosContrato.vigenciaFim.getTime() - dadosContrato.vigenciaInicio.getTime()) / 
                        (1000 * 60 * 60 * 24 * 30)
                      )
                    } meses
                  </Typography>
                  <Typography variant="body2">
                    <strong>Valor total estimado:</strong> R$ {
                      ((dadosContrato.valor || 0) * Math.ceil(
                        (dadosContrato.vigenciaFim.getTime() - dadosContrato.vigenciaInicio.getTime()) / 
                        (1000 * 60 * 60 * 24 * 30)
                      )).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                    }
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        );

      case 3: // Revisão
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Revisão dos Dados
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Confirme se todas as informações estão corretas antes de criar o contrato.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Dados Básicos
                  </Typography>
                  <Typography variant="body2"><strong>Nome:</strong> {dadosContrato.nome}</Typography>
                  <Typography variant="body2"><strong>Cliente:</strong> {dadosContrato.cliente}</Typography>
                  <Typography variant="body2"><strong>Localização:</strong> {dadosContrato.localizacao}</Typography>
                  {dadosContrato.responsavel && (
                    <Typography variant="body2"><strong>Responsável:</strong> {dadosContrato.responsavel}</Typography>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Informações Contratuais
                  </Typography>
                  <Typography variant="body2"><strong>Número:</strong> {dadosContrato.numeroContrato}</Typography>
                  <Typography variant="body2"><strong>Status:</strong> {dadosContrato.status}</Typography>
                  <Typography variant="body2"><strong>Objeto:</strong> {dadosContrato.objeto}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Vigência e Valor
                  </Typography>
                  <Typography variant="body2">
                    <strong>Período:</strong> {format(dadosContrato.vigenciaInicio!, 'dd/MM/yyyy')} a {format(dadosContrato.vigenciaFim!, 'dd/MM/yyyy')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Valor Mensal:</strong> R$ {(dadosContrato.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Duração:</strong> {Math.ceil((dadosContrato.vigenciaFim!.getTime() - dadosContrato.vigenciaInicio!.getTime()) / (1000 * 60 * 60 * 24 * 30))} meses
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <BusinessIcon color="primary" />
          <Typography variant="h6">Criar Novo Contrato</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>
                  <Typography variant="body1" fontWeight={activeStep === index ? 600 : 400}>
                    {label}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Box sx={{ py: 2 }}>
                    {renderStepContent(index)}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Voltar
          </Button>
        )}

        {activeStep < steps.length - 1 ? (
          <Button 
            variant="contained" 
            onClick={handleNext}
            disabled={loading}
          >
            Próximo
          </Button>
        ) : (
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Criando...' : 'Criar Contrato'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CriacaoContrato; 