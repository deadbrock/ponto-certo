import axios from 'axios';

export interface EstadoContrato {
  uf: string;
  nomeEstado: string;
  statusContrato: 'ativo' | 'vencido' | 'proximo-vencimento' | 'sem-contratos';
  totalContratos: number;
  totalFuncionarios: number;
  valorTotal: number;
  clientes: string[];
  contratos: ContratoResumo[];
}

export interface ContratoResumo {
  id: string;
  nome: string;
  cliente: string;
  cidade: string;
  valor: number;
  vigenciaInicio: string;
  vigenciaFim: string;
  status: 'ativo' | 'vencido' | 'proximo-vencimento';
  totalColaboradores: number;
}

export interface FiltrosMapa {
  status?: string[];
  cliente?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
}

export interface DadosMapaAtuacao {
  estados: EstadoContrato[];
  resumo: {
    totalEstados: number;
    totalContratos: number;
    totalFuncionarios: number;
    valorTotalContratos: number;
    estadosAtivos: number;
    estadosVencidos: number;
    estadosProximoVencimento: number;
  };
}

class MapaService {
  private api = axios.create({
    baseURL: 'http://localhost:3333/api',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Interceptor para adicionar token de autenticação
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Buscar dados do mapa de atuação
  async buscarDadosMapaAtuacao(filtros?: FiltrosMapa): Promise<DadosMapaAtuacao> {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.status && filtros.status.length > 0) {
        filtros.status.forEach(status => params.append('status', status));
      }
      
      if (filtros?.cliente) {
        params.append('cliente', filtros.cliente);
      }
      
      if (filtros?.vigenciaInicio) {
        params.append('vigenciaInicio', filtros.vigenciaInicio);
      }
      
      if (filtros?.vigenciaFim) {
        params.append('vigenciaFim', filtros.vigenciaFim);
      }

      const response = await this.api.get(`/contratos/mapa-atuacao?${params.toString()}`);
      
      if (response.data) {
        return response.data;
      }
      
      // Dados mock para desenvolvimento
      return this.gerarDadosMock();
    } catch (error) {
      console.warn('Erro ao buscar dados do mapa, usando dados mock:', error);
      return this.gerarDadosMock();
    }
  }

  // Buscar detalhes de contratos por estado
  async buscarContratosPorEstado(uf: string): Promise<ContratoResumo[]> {
    try {
      const response = await this.api.get(`/contratos/por-estado/${uf}`);
      return response.data || [];
    } catch (error) {
      console.warn('Erro ao buscar contratos por estado, usando dados mock:', error);
      return this.gerarContratosMockPorEstado(uf);
    }
  }

  // Buscar lista de clientes para filtros
  async buscarClientes(): Promise<string[]> {
    try {
      const response = await this.api.get('/contratos/clientes');
      return response.data || [];
    } catch (error) {
      console.warn('Erro ao buscar clientes:', error);
      // DADOS MOCK REMOVIDOS - Sistema limpo
      return [];
    }
  }

  // DADOS MOCK REMOVIDOS - Sistema limpo para dados reais
  private gerarDadosMock(): DadosMapaAtuacao {
    // Sistema iniciando vazio - contratos serão carregados do backend real
    const estados: EstadoContrato[] = [];

    const resumo = {
      totalEstados: 0,
      totalContratos: 0,
      totalFuncionarios: 0,
      valorTotalContratos: 0,
      estadosAtivos: 0,
      estadosVencidos: 0,
      estadosProximoVencimento: 0
    };

    return { estados, resumo };
  }

  // DADOS MOCK REMOVIDOS - Sistema limpo para dados reais
  private gerarContratosMockPorEstado(uf: string): ContratoResumo[] {
    // Sistema iniciando vazio - contratos serão carregados do backend real
    return [];
  }
}

export const mapaService = new MapaService();
export default mapaService; 