import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import AtestadosPage from '../../pages/AtestadosPage'
import { AuthProvider } from '../../contexts/AuthContext'
import { mockApiResponses, mockAxios, mockAtestados } from '../__mocks__/api'

// Mock do módulo de API
vi.mock('../../services/api', () => ({
  api: mockAxios
}))

// Mock do File API
const createMockFile = (name: string, type: string) => {
  const blob = new Blob(['mock file content'], { type })
  return new File([blob], name, { type })
}

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('AtestadosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('token', 'mock-token')
  })

  describe('Renderização inicial', () => {
    it('deve renderizar título e botão novo atestado', async () => {
      renderWithProviders(<AtestadosPage />)

      expect(screen.getByText(/atestados médicos/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /novo atestado/i })).toBeInTheDocument()
    })

    it('deve carregar atestados da API', async () => {
      renderWithProviders(<AtestadosPage />)

      await waitFor(() => {
        expect(mockApiResponses.listarAtestados).toHaveBeenCalled()
      })
    })

    it('deve exibir atestados carregados', async () => {
      renderWithProviders(<AtestadosPage />)

      await waitFor(() => {
        expect(screen.getByText('João Silva')).toBeInTheDocument()
        expect(screen.getByText('Maria Santos')).toBeInTheDocument()
        expect(screen.getByText('Gripe')).toBeInTheDocument()
      })
    })
  })

  describe('Modal de criação', () => {
    it('deve abrir modal ao clicar em Novo Atestado', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AtestadosPage />)

      await user.click(screen.getByRole('button', { name: /novo atestado/i }))

      await waitFor(() => {
        expect(screen.getByText(/novo atestado/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/colaborador/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument()
      })
    })

    it('deve validar campos obrigatórios', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AtestadosPage />)

      await user.click(screen.getByRole('button', { name: /novo atestado/i }))
      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => {
        expect(screen.getByText(/colaborador.*obrigatório/i)).toBeInTheDocument()
      })
    })
  })

  describe('Upload de arquivo', () => {
    it('deve permitir upload de PDF', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AtestadosPage />)

      await user.click(screen.getByRole('button', { name: /novo atestado/i }))

      const fileInput = screen.getByLabelText(/anexar documento/i)
      const file = createMockFile('atestado.pdf', 'application/pdf')
      
      await user.upload(fileInput, file)

      expect(fileInput.files![0]).toBe(file)
      expect(screen.getByText('atestado.pdf')).toBeInTheDocument()
    })

    it('deve validar tipo de arquivo', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AtestadosPage />)

      await user.click(screen.getByRole('button', { name: /novo atestado/i }))

      const fileInput = screen.getByLabelText(/anexar documento/i)
      const file = createMockFile('documento.txt', 'text/plain')
      
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText(/formato não permitido/i)).toBeInTheDocument()
      })
    })
  })

  describe('Aprovação de atestados', () => {
    it('deve aprovar atestado', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AtestadosPage />)

      await waitFor(() => {
        const pendente = screen.getByText('Maria Santos').closest('tr')
        const botaoAprovar = within(pendente!).getByTestId('botao-aprovar')
        user.click(botaoAprovar)
      })

      await waitFor(() => {
        expect(mockApiResponses.atualizarStatusAtestado).toHaveBeenCalledWith(
          2, 'aprovado', expect.any(String)
        )
      })
    })

    it('deve rejeitar atestado com motivo', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AtestadosPage />)

      await waitFor(() => {
        const pendente = screen.getByText('Maria Santos').closest('tr')
        const botaoRejeitar = within(pendente!).getByTestId('botao-rejeitar')
        user.click(botaoRejeitar)
      })

      await user.type(screen.getByLabelText(/motivo/i), 'Documento ilegível')
      await user.click(screen.getByRole('button', { name: /confirmar/i }))

      await waitFor(() => {
        expect(mockApiResponses.atualizarStatusAtestado).toHaveBeenCalledWith(
          2, 'rejeitado', 'Documento ilegível'
        )
      })
    })
  })

  describe('Filtros', () => {
    it('deve filtrar por status', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AtestadosPage />)

      const statusFilter = screen.getByLabelText(/status/i)
      await user.click(statusFilter)
      await user.click(screen.getByText('Aprovado'))

      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/atestados'),
          expect.objectContaining({
            params: expect.objectContaining({
              status: 'aprovado'
            })
          })
        )
      })
    })
  })

  describe('Tratamento de erros', () => {
    it('deve exibir erro ao falhar carregamento', async () => {
      mockApiResponses.listarAtestados.mockRejectedValueOnce(
        new Error('Erro de conexão')
      )

      renderWithProviders(<AtestadosPage />)

      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument()
      })
    })

    it('deve exibir erro ao falhar criação', async () => {
      const user = userEvent.setup()
      
      mockApiResponses.criarAtestado.mockRejectedValueOnce({
        response: { data: { error: 'Arquivo muito grande' } }
      })

      renderWithProviders(<AtestadosPage />)

      await user.click(screen.getByRole('button', { name: /novo atestado/i }))
      await user.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => {
        expect(screen.getByText(/arquivo muito grande/i)).toBeInTheDocument()
      })
    })
  })
}) 