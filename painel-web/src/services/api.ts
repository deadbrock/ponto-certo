import axios from 'axios';
import { getApiBaseUrl, appConfig } from '../config/app';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: appConfig.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar o token JWT em todas as requisições
api.interceptors.request.use(config => {
  const token = localStorage.getItem(appConfig.AUTH_TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Exportar a instância da API para uso em outros módulos
export { api };

export interface UsuarioBackend {
  id: number;
  nome: string;
  email: string;
  perfil: 'administrador' | 'Administrador' | 'Gestor' | 'RH';
  ativo: boolean;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  usuario: UsuarioBackend;
  message?: string;
  session?: any;
}

export const loginApi = async (email: string, senha: string): Promise<LoginResponse> => {
  try {
    console.log('🔐 Tentando login com backend real:', { email, senha: '***' });
    console.log('🌐 URL do backend:', api.defaults.baseURL);
    
    // Realizar login diretamente com o backend real
    const response = await api.post('/auth/login-admin', { email, senha });
    
    console.log('✅ Resposta do backend:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Erro no login:', error);
    console.error('📋 Detalhes do erro:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    
    // Retornar erro de credenciais inválidas
    return {
      success: false,
      token: '',
      usuario: {
        id: 0,
        nome: '',
        email: '',
        perfil: 'Administrador',
        ativo: false
      },
      message: 'Credenciais inválidas'
    };
  }
};

// Buscar colaboradores para autocomplete
export const buscarColaboradoresApi = async (search: string, page = 1) => {
  const response = await api.get(`/colaboradores?search=${encodeURIComponent(search)}&page=${page}`);
  return response.data;
};

// Buscar registros de ponto com filtros e paginação
export const buscarRegistrosPontoApi = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  colaborador_id?: number;
  unidade?: string;
  tipo?: string;
  data_inicio?: string;
  data_fim?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.append(key, String(value));
  });
  // Usar endpoint público que não requer autenticação JWT
  const response = await api.get(`/ponto/registros-public?${query.toString()}`);
  return response.data;
};

// Listar usuários com filtros e paginação
export const listarUsuariosApi = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  perfil?: string;
  ativo?: boolean;
}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.append(key, String(value));
  });
  const response = await api.get(`/usuarios?${query.toString()}`);
  return response.data;
};

// Cadastrar usuário
export const cadastrarUsuarioApi = async (usuario: {
  nome: string;
  email: string;
  perfil: string;
  senha: string;
}) => {
  const response = await api.post('/usuarios', usuario);
  return response.data;
};

// Editar usuário
export const editarUsuarioApi = async (id: number, usuario: Partial<UsuarioBackend>) => {
  const response = await api.put(`/usuarios/${id}`, usuario);
  return response.data;
};

// Ativar/desativar usuário
export const ativarUsuarioApi = async (id: number) => {
  const response = await api.patch(`/usuarios/${id}/ativar`);
  return response.data;
};

export const desativarUsuarioApi = async (id: number) => {
  const response = await api.patch(`/usuarios/${id}/desativar`);
  return response.data;
};

// Listar atestados/abonos com filtros e paginação
export const listarAtestadosApi = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tipo?: string;
  colaborador_id?: number;
  data_inicio?: string;
  data_fim?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.append(key, String(value));
  });
  const response = await api.get(`/atestados?${query.toString()}`);
  return response.data;
};

// Aprovar/rejeitar atestado
export const aprovarAtestadoApi = async (id: number) => {
  const response = await api.patch(`/atestados/${id}/aprovar`);
  return response.data;
};

export const rejeitarAtestadoApi = async (id: number) => {
  const response = await api.patch(`/atestados/${id}/rejeitar`);
  return response.data;
};

// Listar escalas com filtros e paginação
export const listarEscalasApi = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  tipo?: string;
  colaboradorOuEquipe?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.append(key, String(value));
  });
  const response = await api.get(`/escalas?${query.toString()}`);
  return response.data;
};

// Cadastrar escala
export const cadastrarEscalaApi = async (escala: {
  colaboradorOuEquipe: string;
  tipo: string;
  horario: string;
  vigencia: string;
}) => {
  const response = await api.post('/escalas', escala);
  return response.data;
};

// Editar escala
export const editarEscalaApi = async (id: number, escala: Partial<{ colaboradorOuEquipe: string; tipo: string; horario: string; vigencia: string; }>) => {
  const response = await api.put(`/escalas/${id}`, escala);
  return response.data;
};

// Excluir escala
export const excluirEscalaApi = async (id: number) => {
  const response = await api.delete(`/escalas/${id}`);
  return response.data;
};

// Listar feriados
export const listarFeriadosApi = async () => {
  const response = await api.get('/feriados');
  return response.data;
};

// Cadastrar feriado
export const cadastrarFeriadoApi = async (feriado: { nome: string; data: string }) => {
  const response = await api.post('/feriados', feriado);
  return response.data;
};

// Salvar parâmetros sindicais
export const salvarParametrosSindicaisApi = async (texto: string) => {
  const response = await api.post('/configuracoes/parametros-sindicais', { texto });
  return response.data;
};

// ===== RELATÓRIOS E AUDITORIA =====

export interface LogAuditoria {
  id: number;
  data_hora: string;
  usuario_nome: string;
  usuario_email: string;
  acao: string;
  detalhes: string;
  ip_address?: string;
}

export interface LogCorrecao {
  id: number;
  data_correcao: string;
  colaborador_nome: string;
  colaborador_cpf: string;
  usuario_autor_nome: string;
  acao: string;
  justificativa: string;
  data_hora_original?: string;
  data_hora_nova?: string;
}

// Exportar relatório AFD
export const exportarRelatorioAFD = async (dataInicio: string, dataFim: string) => {
  const response = await api.get(`/relatorios/afd?data_inicio=${dataInicio}&data_fim=${dataFim}`, {
    responseType: 'blob'
  });
  
  // Criar download automático
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `AFD_${dataInicio}_${dataFim}.txt`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  
  return { success: true, message: 'Relatório AFD exportado com sucesso!' };
};

// Exportar relatório ACJEF
export const exportarRelatorioACJEF = async (dataInicio: string, dataFim: string) => {
  const response = await api.get(`/relatorios/acjef?data_inicio=${dataInicio}&data_fim=${dataFim}`, {
    responseType: 'blob'
  });
  
  // Criar download automático
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `ACJEF_${dataInicio}_${dataFim}.json`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  
  return { success: true, message: 'Relatório ACJEF exportado com sucesso!' };
};

// Listar logs de auditoria
export const listarLogsAuditoriaApi = async (params: {
  limite?: number;
  offset?: number;
  usuario?: string;
  acao?: string;
  data_inicio?: string;
  data_fim?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.append(key, String(value));
  });
  const response = await api.get(`/auditoria/logs?${query.toString()}`);
  return response.data;
};

// Registrar log de auditoria
export const registrarLogAuditoriaApi = async (log: {
  usuario_id: number;
  acao: string;
  detalhes: string;
  ip_address?: string;
}) => {
  const response = await api.post('/auditoria/logs', log);
  return response.data;
};

// Listar correções de ponto
export const listarCorrecoesApi = async (params: {
  limite?: number;
  offset?: number;
  colaborador?: string;
  autor?: string;
  data_inicio?: string;
  data_fim?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.append(key, String(value));
  });
  const response = await api.get(`/auditoria/correcoes?${query.toString()}`);
  return response.data;
};

// Registrar correção de ponto
export const registrarCorrecaoApi = async (correcao: {
  colaborador_id: number;
  usuario_autor_id: number;
  acao: string;
  justificativa: string;
  data_hora_original?: string;
  data_hora_nova?: string;
}) => {
  const response = await api.post('/auditoria/correcoes', correcao);
  return response.data;
};

export default api; 