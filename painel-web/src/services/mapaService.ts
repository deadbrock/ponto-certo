import axios from 'axios';
import { getApiBaseUrl } from '../config/app';

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
    baseURL: getApiBaseUrl(),
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

      // Usar o endpoint implementado no backend
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
      // Usar endpoint que existe no backend
      const response = await this.api.get(`/contratos?localizacao=${uf}`);
      return response.data || [];
    } catch (error) {
      console.warn('Erro ao buscar contratos por estado:', error);
      return [];
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

  // DADOS MOCK TEMPORÁRIOS - Para demonstração do Mapa Avançado
  private gerarDadosMock(): DadosMapaAtuacao {
    const estados: EstadoContrato[] = [
      {
        uf: 'SP',
        nomeEstado: 'São Paulo',
        statusContrato: 'ativo',
        totalContratos: 5,
        totalFuncionarios: 250,
        valorTotal: 1500000,
        clientes: ['Empresa A', 'Empresa B', 'Empresa C'],
        contratos: [
          {
            id: '1',
            nome: 'Contrato Segurança SP',
            cliente: 'Empresa A',
            cidade: 'São Paulo',
            valor: 500000,
            vigenciaInicio: '2024-01-01',
            vigenciaFim: '2024-12-31',
            status: 'ativo',
            totalColaboradores: 100
          }
        ]
      },
      {
        uf: 'RJ',
        nomeEstado: 'Rio de Janeiro',
        statusContrato: 'proximo-vencimento',
        totalContratos: 3,
        totalFuncionarios: 120,
        valorTotal: 800000,
        clientes: ['Empresa D', 'Empresa E'],
        contratos: [
          {
            id: '2',
            nome: 'Contrato Limpeza RJ',
            cliente: 'Empresa D',
            cidade: 'Rio de Janeiro',
            valor: 400000,
            vigenciaInicio: '2024-01-01',
            vigenciaFim: '2024-08-31',
            status: 'proximo-vencimento',
            totalColaboradores: 60
          }
        ]
      },
      {
        uf: 'MG',
        nomeEstado: 'Minas Gerais',
        statusContrato: 'ativo',
        totalContratos: 2,
        totalFuncionarios: 80,
        valorTotal: 600000,
        clientes: ['Empresa F'],
        contratos: [
          {
            id: '3',
            nome: 'Contrato Vigilância MG',
            cliente: 'Empresa F',
            cidade: 'Belo Horizonte',
            valor: 300000,
            vigenciaInicio: '2024-03-01',
            vigenciaFim: '2025-02-28',
            status: 'ativo',
            totalColaboradores: 40
          }
        ]
      },
      {
        uf: 'BA',
        nomeEstado: 'Bahia',
        statusContrato: 'vencido',
        totalContratos: 1,
        totalFuncionarios: 30,
        valorTotal: 200000,
        clientes: ['Empresa G'],
        contratos: [
          {
            id: '4',
            nome: 'Contrato Portaria BA',
            cliente: 'Empresa G',
            cidade: 'Salvador',
            valor: 200000,
            vigenciaInicio: '2023-01-01',
            vigenciaFim: '2023-12-31',
            status: 'vencido',
            totalColaboradores: 30
          }
        ]
      }
    ];

    const resumo = {
      totalEstados: 4,
      totalContratos: 11,
      totalFuncionarios: 480,
      valorTotalContratos: 3100000,
      estadosAtivos: 2,
      estadosVencidos: 1,
      estadosProximoVencimento: 1
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