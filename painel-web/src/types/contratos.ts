export interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
  status: 'Ativo' | 'Desligado';
  alocadoEmContratoId: string | null;
  cpf?: string;
  telefone?: string;
  email?: string;
  dataAdmissao?: Date;
}

export interface DocumentoContrato {
  id: string;
  contratoId: string;
  tipo: 'Contrato' | 'Aditivo' | 'Memorando' | 'Outro';
  nome: string;
  url: string;
  criadoEm: Date;
  criadoPor: string;
  tamanho?: number;
  observacoes?: string;
}

export interface AlteracaoContrato {
  id: string;
  contratoId: string;
  campoAlterado: string;
  valorAntigo: string;
  valorNovo: string;
  alteradoPor: string;
  dataAlteracao: Date;
  observacoes?: string;
}

export interface Contrato {
  id: string;
  nome: string;
  cliente: string;
  localizacao: string;
  valor: number;
  vigenciaInicio: Date;
  vigenciaFim: Date;
  status: 'Ativo' | 'Vencido' | 'Próximo do vencimento';
  colaboradores: Colaborador[];
  documentos: DocumentoContrato[];
  historicoAlteracoes: AlteracaoContrato[];
  descricao?: string;
  responsavel?: string;
  coordenadas?: {
    latitude: number;
    longitude: number;
  };
  criadoEm: Date;
  atualizadoEm: Date;
  numeroContrato?: string;
  objeto?: string;
}

export interface FiltrosContrato {
  status?: string;
  cliente?: string;
  localizacao?: string;
  vigenciaInicio?: Date;
  vigenciaFim?: Date;
  responsavel?: string;
  busca?: string;
}

export interface KPIsContrato {
  totalColaboradores: number;
  percentualPresenca: number;
  numeroAfastamentos: number;
  rotatividade: number;
  diasRestantes: number;
  valorMensal: number;
}

export interface RelatorioContrato {
  contrato: Contrato;
  kpis: KPIsContrato;
  colaboradores: Colaborador[];
  documentos: DocumentoContrato[];
  historico: AlteracaoContrato[];
  periodo: {
    inicio: Date;
    fim: Date;
  };
}

export interface AlertaVigencia {
  id: string;
  contratoId: string;
  tipo: 'vencimento_30' | 'vencimento_15' | 'vencimento_5' | 'vencido';
  mensagem: string;
  dataAlerta: Date;
  visualizado: boolean;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
}

export interface DashboardContratos {
  totalContratos: number;
  contratosAtivos: number;
  contratosVencidos: number;
  contratosProximoVencimento: number;
  valorTotalContratos: number;
  colaboradoresTotais: number;
  alertasVigencia: AlertaVigencia[];
  distribuicaoStatus: {
    label: string;
    value: number;
    color: string;
  }[];
} 