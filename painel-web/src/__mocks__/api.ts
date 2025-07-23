import { vi } from 'vitest'

// Mock data
export const mockUsuario = {
  id: 1,
  nome: 'Administrador',
  email: 'admin@fgservices.com',
  perfil: 'administrador'
}

export const mockEstatisticas = [
  { title: 'Colaboradores Ativos', value: 42, trend: '+5%', color: 'primary' },
  { title: 'Registros Hoje', value: 85, trend: '+12%', color: 'success' },
  { title: 'Presença Hoje', value: '94.2%', trend: '+2%', color: 'info' },
  { title: 'Alertas', value: 3, trend: '-1', color: 'warning' }
]

export const mockRegistros = [
  {
    id: 1,
    colaborador_nome: 'João Silva',
    data_hora: '2025-01-15T08:00:00Z',
    tipo_registro: 'entrada',
    latitude: -23.5505199,
    longitude: -46.6333094
  },
  {
    id: 2,
    colaborador_nome: 'Maria Santos',
    data_hora: '2025-01-15T08:15:00Z',
    tipo_registro: 'entrada',
    latitude: -23.5505199,
    longitude: -46.6333094
  }
]

export const mockEscalas = [
  {
    id: 1,
    colaborador_id: 1,
    colaborador_nome: 'João Silva',
    tipo_escala: 'fixo',
    horario_inicio: '08:00',
    horario_fim: '17:00',
    dias_semana: [1, 2, 3, 4, 5],
    ativo: true
  },
  {
    id: 2,
    colaborador_id: 2,
    colaborador_nome: 'Maria Santos',
    tipo_escala: 'flexivel',
    horario_inicio: '09:00',
    horario_fim: '18:00',
    dias_semana: [1, 2, 3, 4, 5],
    ativo: true
  }
]

export const mockAtestados = [
  {
    id: 1,
    colaborador_id: 1,
    colaborador_nome: 'João Silva',
    tipo_atestado: 'medico',
    data_inicio: '2025-01-10',
    data_fim: '2025-01-12',
    motivo: 'Gripe',
    status: 'aprovado'
  },
  {
    id: 2,
    colaborador_id: 2,
    colaborador_nome: 'Maria Santos',
    tipo_atestado: 'odontologico',
    data_inicio: '2025-01-15',
    data_fim: '2025-01-15',
    motivo: 'Consulta odontológica',
    status: 'pendente'
  }
]

export const mockColaboradores = [
  { id: 1, nome: 'João Silva', cpf: '12345678901' },
  { id: 2, nome: 'Maria Santos', cpf: '09876543210' },
  { id: 3, nome: 'Pedro Costa', cpf: '11122233344' }
]

// Mock das funções da API
export const mockApiResponses = {
  // Auth
  loginAdmin: vi.fn().mockResolvedValue({
    data: {
      success: true,
      token: 'mock-jwt-token',
      usuario: mockUsuario
    }
  }),

  // Dashboard
  obterEstatisticas: vi.fn().mockResolvedValue({
    data: {
      success: true,
      stats: mockEstatisticas
    }
  }),

  obterRegistrosRecentes: vi.fn().mockResolvedValue({
    data: {
      success: true,
      registros: mockRegistros
    }
  }),

  // Registros
  listarRegistros: vi.fn().mockResolvedValue({
    data: {
      success: true,
      registros: mockRegistros,
      total: mockRegistros.length,
      page: 1,
      pages: 1
    }
  }),

  // Escalas
  listarEscalas: vi.fn().mockResolvedValue({
    data: {
      success: true,
      escalas: mockEscalas,
      total: mockEscalas.length,
      page: 1,
      pages: 1
    }
  }),

  criarEscala: vi.fn().mockResolvedValue({
    data: {
      success: true,
      message: 'Escala criada com sucesso',
      escala: mockEscalas[0]
    }
  }),

  editarEscala: vi.fn().mockResolvedValue({
    data: {
      success: true,
      message: 'Escala atualizada com sucesso'
    }
  }),

  excluirEscala: vi.fn().mockResolvedValue({
    data: {
      success: true,
      message: 'Escala excluída com sucesso'
    }
  }),

  // Atestados
  listarAtestados: vi.fn().mockResolvedValue({
    data: {
      success: true,
      solicitacoes: mockAtestados,
      total: mockAtestados.length,
      page: 1,
      pages: 1
    }
  }),

  criarAtestado: vi.fn().mockResolvedValue({
    data: {
      success: true,
      message: 'Atestado criado com sucesso',
      atestado: mockAtestados[0]
    }
  }),

  atualizarStatusAtestado: vi.fn().mockResolvedValue({
    data: {
      success: true,
      message: 'Status atualizado com sucesso'
    }
  }),

  // Colaboradores
  buscarColaboradores: vi.fn().mockResolvedValue({
    data: {
      success: true,
      colaboradores: mockColaboradores
    }
  })
}

// Mock do módulo axios
export const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn()
}

// Configurar respostas padrão do axios
mockAxios.get.mockImplementation((url: string) => {
  if (url.includes('/dashboard/estatisticas')) return mockApiResponses.obterEstatisticas()
  if (url.includes('/dashboard/registros-recentes')) return mockApiResponses.obterRegistrosRecentes()
  if (url.includes('/registros')) return mockApiResponses.listarRegistros()
  if (url.includes('/escalas')) return mockApiResponses.listarEscalas()
  if (url.includes('/atestados')) return mockApiResponses.listarAtestados()
  if (url.includes('/colaboradores')) return mockApiResponses.buscarColaboradores()
  
  return Promise.resolve({ data: { success: true } })
})

mockAxios.post.mockImplementation((url: string) => {
  if (url.includes('/auth/login-admin')) return mockApiResponses.loginAdmin()
  if (url.includes('/escalas')) return mockApiResponses.criarEscala()
  if (url.includes('/atestados')) return mockApiResponses.criarAtestado()
  
  return Promise.resolve({ data: { success: true } })
})

mockAxios.put.mockImplementation((url: string) => {
  if (url.includes('/escalas/')) return mockApiResponses.editarEscala()
  if (url.includes('/atestados/') && url.includes('/status')) return mockApiResponses.atualizarStatusAtestado()
  
  return Promise.resolve({ data: { success: true } })
})

mockAxios.delete.mockImplementation(() => {
  return mockApiResponses.excluirEscala()
}) 