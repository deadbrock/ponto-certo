import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import EscalasPage from '../../pages/EscalasPage'
import { AuthProvider } from '../../contexts/AuthContext'
import { mockApiResponses, mockAxios, mockEscalas, mockColaboradores } from '../__mocks__/api'

// Mock do módulo de API
vi.mock('../../services/api', () => ({
  api: mockAxios
}))

// Wrapper para provedores
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('EscalasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('token', 'mock-token')
  })

  describe('Renderização inicial', () => {
    it('deve renderizar título da página', async () => {
      renderWithProviders(<EscalasPage />)

      expect(screen.getByText(/escalas e feriados/i)).toBeInTheDocument()
    })

    it('deve carregar escalas na inicialização', async () => {
      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        expect(mockApiResponses.listarEscalas).toHaveBeenCalled()
      })
    })

    it('deve exibir loading durante carregamento', () => {
      mockApiResponses.listarEscalas.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      renderWithProviders(<EscalasPage />)

      expect(screen.getByText(/carregando escalas/i)).toBeInTheDocument()
    })

    it('deve renderizar botão Nova Escala', async () => {
      renderWithProviders(<EscalasPage />)

      expect(screen.getByRole('button', { name: /nova escala/i })).toBeInTheDocument()
    })
  })

  describe('Listagem de escalas', () => {
    it('deve exibir escalas carregadas da API', async () => {
      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        mockEscalas.forEach(escala => {
          expect(screen.getByText(escala.colaborador_nome!)).toBeInTheDocument()
          expect(screen.getByText(escala.tipo_escala)).toBeInTheDocument()
        })
      })
    })

    it('deve formatar horários corretamente', async () => {
      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        expect(screen.getByText('08:00 - 17:00')).toBeInTheDocument()
        expect(screen.getByText('09:00 - 18:00')).toBeInTheDocument()
      })
    })

    it('deve exibir dias da semana formatados', async () => {
      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        expect(screen.getByText(/segunda, terça, quarta, quinta, sexta/i)).toBeInTheDocument()
      })
    })

    it('deve exibir tipos de escala com chips coloridos', async () => {
      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        const fixoChip = screen.getByText('fixo').closest('.MuiChip-root')
        const flexivelChip = screen.getByText('flexivel').closest('.MuiChip-root')
        
        expect(fixoChip).toHaveClass('MuiChip-colorPrimary')
        expect(flexivelChip).toHaveClass('MuiChip-colorPrimary')
      })
    })

    it('deve exibir mensagem quando não há escalas', async () => {
      mockApiResponses.listarEscalas.mockResolvedValueOnce({
        data: {
          success: true,
          escalas: [],
          total: 0,
          page: 1,
          pages: 1
        }
      })

      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        expect(screen.getByText(/nenhuma escala cadastrada/i)).toBeInTheDocument()
      })
    })
  })

  describe('Modal de criação/edição', () => {
    it('deve abrir modal ao clicar em Nova Escala', async () => {
      const user = userEvent.setup()
      renderWithProviders(<EscalasPage />)

      const botaoNova = screen.getByRole('button', { name: /nova escala/i })
      await user.click(botaoNova)

      await waitFor(() => {
        expect(screen.getByText(/nova escala/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/colaborador/i)).toBeInTheDocument()
      })
    })

    it('deve renderizar todos os campos do formulário', async () => {
      const user = userEvent.setup()
      renderWithProviders(<EscalasPage />)

      const botaoNova = screen.getByRole('button', { name: /nova escala/i })
      await user.click(botaoNova)

      await waitFor(() => {
        expect(screen.getByLabelText(/colaborador/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/tipo de escala/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/início/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/fim/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/dias da semana/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/observações/i)).toBeInTheDocument()
      })
    })

    it('deve preencher formulário com dados da escala ao editar', async () => {
      const user = userEvent.setup()
      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        const primeiraEscala = screen.getByText('João Silva').closest('tr')
        const botaoEditar = within(primeiraEscala!).getByTestId('botao-editar')
        user.click(botaoEditar)
      })

      await waitFor(() => {
        expect(screen.getByDisplayValue('08:00')).toBeInTheDocument()
        expect(screen.getByDisplayValue('17:00')).toBeInTheDocument()
        expect(screen.getByDisplayValue('fixo')).toBeInTheDocument()
      })
    })

    it('deve fechar modal ao cancelar', async () => {
      const user = userEvent.setup()
      renderWithProviders(<EscalasPage />)

      const botaoNova = screen.getByRole('button', { name: /nova escala/i })
      await user.click(botaoNova)

      const botaoCancelar = screen.getByRole('button', { name: /cancelar/i })
      await user.click(botaoCancelar)

      await waitFor(() => {
        expect(screen.queryByText(/nova escala/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Autocomplete de colaboradores', () => {
    it('deve carregar colaboradores ao digitar', async () => {
      const user = userEvent.setup()
      renderWithProviders(<EscalasPage />)

      const botaoNova = screen.getByRole('button', { name: /nova escala/i })
      await user.click(botaoNova)

      const colaboradorInput = screen.getByLabelText(/colaborador/i)
      await user.type(colaboradorInput, 'João')

      await waitFor(() => {
        expect(mockApiResponses.buscarColaboradores).toHaveBeenCalledWith('João', 1)
      })
    })

    it('deve exibir loading no autocomplete', async () => {
      const user = userEvent.setup()
      
      mockApiResponses.buscarColaboradores.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      renderWithProviders(<EscalasPage />)

      const botaoNova = screen.getByRole('button', { name: /nova escala/i })
      await user.click(botaoNova)

      const colaboradorInput = screen.getByLabelText(/colaborador/i)
      await user.type(colaboradorInput, 'João')

      expect(screen.getByTestId('autocomplete-loading')).toBeInTheDocument()
    })

    it('deve selecionar colaborador da lista', async () => {
      const user = userEvent.setup()
      renderWithProviders(<EscalasPage />)

      const botaoNova = screen.getByRole('button', { name: /nova escala/i })
      await user.click(botaoNova)

      const colaboradorInput = screen.getByLabelText(/colaborador/i)
      await user.type(colaboradorInput, 'João')

      await waitFor(() => {
        expect(screen.getByText('João Silva')).toBeInTheDocument()
      })

      await user.click(screen.getByText('João Silva'))

      expect(colaboradorInput).toHaveValue('João Silva')
    })
  })

  describe('Validação do formulário', () => {
    it('deve validar campos obrigatórios', async () => {
      const user = userEvent.setup()
      renderWithProviders(<EscalasPage />)

      const botaoNova = screen.getByRole('button', { name: /nova escala/i })
      await user.click(botaoNova)

      const botaoSalvar = screen.getByRole('button', { name: /criar/i })
      await user.click(botaoSalvar)

      await waitFor(() => {
        expect(screen.getByText(/colaborador.*obrigatório/i)).toBeInTheDocument()
      })
    })

    it('deve validar horários', async () => {
      const user = userEvent.setup()
      renderWithProviders(<EscalasPage />)

      const botaoNova = screen.getByRole('button', { name: /nova escala/i })
      await user.click(botaoNova)

      // Preencher dados básicos
      const tipoSelect = screen.getByLabelText(/tipo de escala/i)
      await user.click(tipoSelect)
      await user.click(screen.getByText('fixo'))

      const inicioInput = screen.getByLabelText(/início/i)
      const fimInput = screen.getByLabelText(/fim/i)

      // Horário fim antes do início
      await user.type(inicioInput, '18:00')
      await user.type(fimInput, '08:00')

      const botaoSalvar = screen.getByRole('button', { name: /criar/i })
      await user.click(botaoSalvar)

      await waitFor(() => {
        expect(screen.getByText(/horário de fim deve ser posterior ao início/i)).toBeInTheDocument()
      })
    })
  })

  describe('Criação de escala', () => {
    it('deve criar nova escala com dados válidos', async () => {
      const user = userEvent.setup()
      renderWithProviders(<EscalasPage />)

      const botaoNova = screen.getByRole('button', { name: /nova escala/i })
      await user.click(botaoNova)

      // Preencher formulário
      const colaboradorInput = screen.getByLabelText(/colaborador/i)
      await user.type(colaboradorInput, 'João')
      await user.click(screen.getByText('João Silva'))

      const tipoSelect = screen.getByLabelText(/tipo de escala/i)
      await user.click(tipoSelect)
      await user.click(screen.getByText('fixo'))

      const inicioInput = screen.getByLabelText(/início/i)
      const fimInput = screen.getByLabelText(/fim/i)
      await user.type(inicioInput, '08:00')
      await user.type(fimInput, '17:00')

      const diasSelect = screen.getByLabelText(/dias da semana/i)
      await user.click(diasSelect)
      await user.click(screen.getByText('Segunda'))
      await user.click(screen.getByText('Terça'))

      const botaoSalvar = screen.getByRole('button', { name: /criar/i })
      await user.click(botaoSalvar)

      await waitFor(() => {
        expect(mockApiResponses.criarEscala).toHaveBeenCalledWith({
          colaborador_id: 1,
          tipo_escala: 'fixo',
          horario_inicio: '08:00',
          horario_fim: '17:00',
          dias_semana: [1, 2] // Segunda e Terça
        })
      })
    })

    it('deve exibir loading durante criação', async () => {
      const user = userEvent.setup()
      
      mockApiResponses.criarEscala.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      renderWithProviders(<EscalasPage />)

      const botaoNova = screen.getByRole('button', { name: /nova escala/i })
      await user.click(botaoNova)

      // Preencher campos mínimos
      const colaboradorInput = screen.getByLabelText(/colaborador/i)
      await user.type(colaboradorInput, 'João')
      await user.click(screen.getByText('João Silva'))

      const botaoSalvar = screen.getByRole('button', { name: /criar/i })
      await user.click(botaoSalvar)

      expect(screen.getByTestId('loading-salvar')).toBeInTheDocument()
      expect(botaoSalvar).toBeDisabled()
    })

    it('deve fechar modal e recarregar lista após sucesso', async () => {
      const user = userEvent.setup()
      renderWithProviders(<EscalasPage />)

      const botaoNova = screen.getByRole('button', { name: /nova escala/i })
      await user.click(botaoNova)

      // Preencher e salvar (usando dados mínimos)
      const botaoSalvar = screen.getByRole('button', { name: /criar/i })
      await user.click(botaoSalvar)

      await waitFor(() => {
        expect(screen.queryByText(/nova escala/i)).not.toBeInTheDocument()
        expect(mockApiResponses.listarEscalas).toHaveBeenCalledTimes(2) // Inicial + reload
      })
    })
  })

  describe('Edição de escala', () => {
    it('deve abrir modal de edição com dados preenchidos', async () => {
      const user = userEvent.setup()
      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        const primeiraEscala = screen.getByText('João Silva').closest('tr')
        const botaoEditar = within(primeiraEscala!).getByTestId('botao-editar')
        user.click(botaoEditar)
      })

      await waitFor(() => {
        expect(screen.getByText(/editar escala/i)).toBeInTheDocument()
        expect(screen.getByDisplayValue('João Silva')).toBeInTheDocument()
        expect(screen.getByDisplayValue('fixo')).toBeInTheDocument()
      })
    })

    it('deve atualizar escala existente', async () => {
      const user = userEvent.setup()
      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        const primeiraEscala = screen.getByText('João Silva').closest('tr')
        const botaoEditar = within(primeiraEscala!).getByTestId('botao-editar')
        user.click(botaoEditar)
      })

      // Alterar horário
      const fimInput = screen.getByDisplayValue('17:00')
      await user.clear(fimInput)
      await user.type(fimInput, '18:00')

      const botaoSalvar = screen.getByRole('button', { name: /atualizar/i })
      await user.click(botaoSalvar)

      await waitFor(() => {
        expect(mockApiResponses.editarEscala).toHaveBeenCalledWith(
          1, // ID da escala
          expect.objectContaining({
            horario_fim: '18:00'
          })
        )
      })
    })
  })

  describe('Exclusão de escala', () => {
    it('deve excluir escala com confirmação', async () => {
      const user = userEvent.setup()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        const primeiraEscala = screen.getByText('João Silva').closest('tr')
        const botaoExcluir = within(primeiraEscala!).getByTestId('botao-excluir')
        user.click(botaoExcluir)
      })

      expect(confirmSpy).toHaveBeenCalledWith('Deseja realmente excluir esta escala?')

      await waitFor(() => {
        expect(mockApiResponses.excluirEscala).toHaveBeenCalledWith(1)
      })
    })

    it('deve cancelar exclusão se usuário não confirmar', async () => {
      const user = userEvent.setup()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        const primeiraEscala = screen.getByText('João Silva').closest('tr')
        const botaoExcluir = within(primeiraEscala!).getByTestId('botao-excluir')
        user.click(botaoExcluir)
      })

      expect(confirmSpy).toHaveBeenCalled()
      expect(mockApiResponses.excluirEscala).not.toHaveBeenCalled()
    })
  })

  describe('Paginação', () => {
    it('deve exibir controles de paginação quando há muitas escalas', async () => {
      mockApiResponses.listarEscalas.mockResolvedValueOnce({
        data: {
          success: true,
          escalas: mockEscalas,
          total: 50,
          page: 1,
          pages: 5
        }
      })

      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        expect(screen.getByTestId('pagination')).toBeInTheDocument()
      })
    })

    it('deve navegar entre páginas', async () => {
      const user = userEvent.setup()
      
      mockApiResponses.listarEscalas.mockResolvedValueOnce({
        data: {
          success: true,
          escalas: mockEscalas,
          total: 50,
          page: 1,
          pages: 5
        }
      })

      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        const proximaPagina = screen.getByLabelText(/ir para próxima página/i)
        user.click(proximaPagina)
      })

      await waitFor(() => {
        expect(mockApiResponses.listarEscalas).toHaveBeenCalledWith({
          page: 2,
          limit: 10
        })
      })
    })
  })

  describe('Tratamento de erros', () => {
    it('deve exibir erro ao falhar carregamento', async () => {
      mockApiResponses.listarEscalas.mockRejectedValueOnce(
        new Error('Erro de conexão')
      )

      renderWithProviders(<EscalasPage />)

      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar dados/i)).toBeInTheDocument()
      })
    })

    it('deve exibir erro ao falhar criação', async () => {
      const user = userEvent.setup()
      
      mockApiResponses.criarEscala.mockRejectedValueOnce({
        response: {
          data: { error: 'Colaborador já possui escala ativa' }
        }
      })

      renderWithProviders(<EscalasPage />)

      const botaoNova = screen.getByRole('button', { name: /nova escala/i })
      await user.click(botaoNova)

      const botaoSalvar = screen.getByRole('button', { name: /criar/i })
      await user.click(botaoSalvar)

      await waitFor(() => {
        expect(screen.getByText(/colaborador já possui escala ativa/i)).toBeInTheDocument()
      })
    })

    it('deve exibir erro genérico para falhas não tratadas', async () => {
      const user = userEvent.setup()
      
      mockApiResponses.criarEscala.mockRejectedValueOnce(
        new Error('Network Error')
      )

      renderWithProviders(<EscalasPage />)

      const botaoNova = screen.getByRole('button', { name: /nova escala/i })
      await user.click(botaoNova)

      const botaoSalvar = screen.getByRole('button', { name: /criar/i })
      await user.click(botaoSalvar)

      await waitFor(() => {
        expect(screen.getByText(/erro interno do servidor/i)).toBeInTheDocument()
      })
    })
  })

  describe('Seção de feriados', () => {
    it('deve renderizar seção de feriados', async () => {
      renderWithProviders(<EscalasPage />)

      expect(screen.getByText(/feriados/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /novo/i })).toBeInTheDocument()
    })

    it('deve abrir modal de novo feriado', async () => {
      const user = userEvent.setup()
      renderWithProviders(<EscalasPage />)

      const botaoNovoFeriado = screen.getByRole('button', { name: /novo/i })
      await user.click(botaoNovoFeriado)

      await waitFor(() => {
        expect(screen.getByText(/novo feriado/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/nome do feriado/i)).toBeInTheDocument()
      })
    })
  })
}) 