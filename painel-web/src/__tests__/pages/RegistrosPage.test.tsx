import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import RegistrosPage from '../../pages/RegistrosPage'
import { AuthProvider } from '../../contexts/AuthContext'
import { mockApiResponses, mockAxios, mockRegistros, mockColaboradores } from '../__mocks__/api'

// Mock do módulo de API
vi.mock('../../services/api', () => ({
  api: mockAxios
}))

// Mock do ExcelService
vi.mock('../../services/excelService', () => ({
  ExcelService: {
    exportarRegistrosPonto: vi.fn()
  }
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

describe('RegistrosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('token', 'mock-token')
  })

  describe('Renderização inicial', () => {
    it('deve renderizar título da página', async () => {
      renderWithProviders(<RegistrosPage />)

      expect(screen.getByText(/registros de ponto/i)).toBeInTheDocument()
    })

    it('deve carregar e exibir registros na inicialização', async () => {
      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        mockRegistros.forEach(registro => {
          expect(screen.getByText(registro.colaborador_nome)).toBeInTheDocument()
        })
      })
    })

    it('deve exibir loading durante carregamento inicial', () => {
      mockApiResponses.listarRegistros.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      renderWithProviders(<RegistrosPage />)

      expect(screen.getByTestId('loading-registros')).toBeInTheDocument()
      expect(screen.getByText(/carregando registros/i)).toBeInTheDocument()
    })
  })

  describe('Tabela de registros', () => {
    it('deve exibir cabeçalhos corretos da tabela', async () => {
      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        expect(screen.getByText('Colaborador')).toBeInTheDocument()
        expect(screen.getByText('Data/Hora')).toBeInTheDocument()
        expect(screen.getByText('Tipo')).toBeInTheDocument()
        expect(screen.getByText('Localização')).toBeInTheDocument()
        expect(screen.getByText('Ações')).toBeInTheDocument()
      })
    })

    it('deve formatar data e hora corretamente', async () => {
      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        // Verificar formato brasileiro de data/hora
        expect(screen.getByText('15/01/2025')).toBeInTheDocument()
        expect(screen.getByText('08:00')).toBeInTheDocument()
        expect(screen.getByText('08:15')).toBeInTheDocument()
      })
    })

    it('deve exibir tipos de registro com cores apropriadas', async () => {
      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        const entradaChips = screen.getAllByText('entrada')
        entradaChips.forEach(chip => {
          const chipElement = chip.closest('.MuiChip-root')
          expect(chipElement).toHaveClass('MuiChip-colorSuccess')
        })
      })
    })

    it('deve exibir coordenadas GPS quando disponíveis', async () => {
      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        expect(screen.getByText(/-23\.55/)).toBeInTheDocument()
        expect(screen.getByText(/-46\.63/)).toBeInTheDocument()
      })
    })

    it('deve exibir mensagem quando não há registros', async () => {
      mockApiResponses.listarRegistros.mockResolvedValueOnce({
        data: {
          success: true,
          registros: [],
          total: 0,
          page: 1,
          pages: 1
        }
      })

      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        expect(screen.getByText(/nenhum registro encontrado/i)).toBeInTheDocument()
      })
    })
  })

  describe('Filtros', () => {
    it('deve renderizar todos os campos de filtro', async () => {
      renderWithProviders(<RegistrosPage />)

      expect(screen.getByLabelText(/colaborador/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/data inicial/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/data final/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tipo de registro/i)).toBeInTheDocument()
    })

    it('deve filtrar por período de datas', async () => {
      const user = userEvent.setup()
      renderWithProviders(<RegistrosPage />)

      const dataInicial = screen.getByLabelText(/data inicial/i)
      const dataFinal = screen.getByLabelText(/data final/i)
      const botaoFiltrar = screen.getByRole('button', { name: /filtrar/i })

      await user.type(dataInicial, '2025-01-10')
      await user.type(dataFinal, '2025-01-20')
      await user.click(botaoFiltrar)

      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/registros'),
          expect.objectContaining({
            params: expect.objectContaining({
              dataInicial: '2025-01-10',
              dataFinal: '2025-01-20'
            })
          })
        )
      })
    })

    it('deve filtrar por colaborador', async () => {
      const user = userEvent.setup()
      renderWithProviders(<RegistrosPage />)

      const colaboradorSelect = screen.getByLabelText(/colaborador/i)
      await user.click(colaboradorSelect)

      // Aguardar options aparecerem
      await waitFor(() => {
        expect(screen.getByText('João Silva')).toBeInTheDocument()
      })

      await user.click(screen.getByText('João Silva'))
      
      const botaoFiltrar = screen.getByRole('button', { name: /filtrar/i })
      await user.click(botaoFiltrar)

      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/registros'),
          expect.objectContaining({
            params: expect.objectContaining({
              colaborador_id: 1
            })
          })
        )
      })
    })

    it('deve filtrar por tipo de registro', async () => {
      const user = userEvent.setup()
      renderWithProviders(<RegistrosPage />)

      const tipoSelect = screen.getByLabelText(/tipo de registro/i)
      await user.click(tipoSelect)

      await user.click(screen.getByText('Entrada'))
      
      const botaoFiltrar = screen.getByRole('button', { name: /filtrar/i })
      await user.click(botaoFiltrar)

      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/registros'),
          expect.objectContaining({
            params: expect.objectContaining({
              tipo: 'entrada'
            })
          })
        )
      })
    })

    it('deve limpar filtros ao clicar em limpar', async () => {
      const user = userEvent.setup()
      renderWithProviders(<RegistrosPage />)

      // Preencher alguns filtros
      const dataInicial = screen.getByLabelText(/data inicial/i)
      await user.type(dataInicial, '2025-01-10')

      // Limpar filtros
      const botaoLimpar = screen.getByRole('button', { name: /limpar filtros/i })
      await user.click(botaoLimpar)

      expect((dataInicial as HTMLInputElement).value).toBe('')
    })

    it('deve validar período de datas', async () => {
      const user = userEvent.setup()
      renderWithProviders(<RegistrosPage />)

      const dataInicial = screen.getByLabelText(/data inicial/i)
      const dataFinal = screen.getByLabelText(/data final/i)
      const botaoFiltrar = screen.getByRole('button', { name: /filtrar/i })

      // Data inicial maior que final
      await user.type(dataInicial, '2025-01-20')
      await user.type(dataFinal, '2025-01-10')
      await user.click(botaoFiltrar)

      await waitFor(() => {
        expect(screen.getByText(/data inicial deve ser anterior à data final/i)).toBeInTheDocument()
      })
    })
  })

  describe('Paginação', () => {
    it('deve exibir controles de paginação', async () => {
      mockApiResponses.listarRegistros.mockResolvedValueOnce({
        data: {
          success: true,
          registros: mockRegistros,
          total: 50,
          page: 1,
          pages: 5
        }
      })

      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        expect(screen.getByText(/página 1 de 5/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /próxima página/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /página anterior/i })).toBeInTheDocument()
      })
    })

    it('deve navegar entre páginas', async () => {
      const user = userEvent.setup()
      
      mockApiResponses.listarRegistros.mockResolvedValueOnce({
        data: {
          success: true,
          registros: mockRegistros,
          total: 50,
          page: 1,
          pages: 5
        }
      })

      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        const proximaPagina = screen.getByRole('button', { name: /próxima página/i })
        user.click(proximaPagina)
      })

      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/registros'),
          expect.objectContaining({
            params: expect.objectContaining({
              page: 2
            })
          })
        )
      })
    })

    it('deve alterar itens por página', async () => {
      const user = userEvent.setup()
      renderWithProviders(<RegistrosPage />)

      const itensPorPagina = screen.getByLabelText(/itens por página/i)
      await user.click(itensPorPagina)
      await user.click(screen.getByText('50'))

      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/registros'),
          expect.objectContaining({
            params: expect.objectContaining({
              limit: 50
            })
          })
        )
      })
    })
  })

  describe('Ações de registro', () => {
    it('deve abrir modal de detalhes ao clicar no registro', async () => {
      const user = userEvent.setup()
      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        const primeiroRegistro = screen.getByText('João Silva').closest('tr')
        const botaoDetalhes = within(primeiroRegistro!).getByTestId('botao-detalhes')
        user.click(botaoDetalhes)
      })

      await waitFor(() => {
        expect(screen.getByText(/detalhes do registro/i)).toBeInTheDocument()
        expect(screen.getByText(/joão silva/i)).toBeInTheDocument()
      })
    })

    it('deve permitir edição de registro autorizada', async () => {
      const user = userEvent.setup()
      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        const primeiroRegistro = screen.getByText('João Silva').closest('tr')
        const botaoEditar = within(primeiroRegistro!).getByTestId('botao-editar')
        user.click(botaoEditar)
      })

      await waitFor(() => {
        expect(screen.getByText(/editar registro/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/observações/i)).toBeInTheDocument()
      })
    })

    it('deve excluir registro com confirmação', async () => {
      const user = userEvent.setup()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        const primeiroRegistro = screen.getByText('João Silva').closest('tr')
        const botaoExcluir = within(primeiroRegistro!).getByTestId('botao-excluir')
        user.click(botaoExcluir)
      })

      expect(confirmSpy).toHaveBeenCalledWith('Deseja realmente excluir este registro?')

      await waitFor(() => {
        expect(mockAxios.delete).toHaveBeenCalledWith('/registros/1')
      })
    })

    it('deve cancelar exclusão se usuário não confirmar', async () => {
      const user = userEvent.setup()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        const primeiroRegistro = screen.getByText('João Silva').closest('tr')
        const botaoExcluir = within(primeiroRegistro!).getByTestId('botao-excluir')
        user.click(botaoExcluir)
      })

      expect(confirmSpy).toHaveBeenCalled()
      expect(mockAxios.delete).not.toHaveBeenCalled()
    })
  })

  describe('Exportação', () => {
    it('deve exportar registros para Excel', async () => {
      const user = userEvent.setup()
      renderWithProviders(<RegistrosPage />)

      const botaoExportar = screen.getByRole('button', { name: /exportar excel/i })
      await user.click(botaoExportar)

      const { ExcelService } = await import('../../services/excelService')
      
      await waitFor(() => {
        expect(ExcelService.exportarRegistrosPonto).toHaveBeenCalledWith(
          mockRegistros,
          expect.any(Object), // filtros
          expect.any(Object)  // opcoes
        )
      })
    })

    it('deve exibir loading durante exportação', async () => {
      const user = userEvent.setup()
      
      const { ExcelService } = await import('../../services/excelService')
      vi.mocked(ExcelService.exportarRegistrosPonto).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      renderWithProviders(<RegistrosPage />)

      const botaoExportar = screen.getByRole('button', { name: /exportar excel/i })
      await user.click(botaoExportar)

      expect(screen.getByText(/exportando/i)).toBeInTheDocument()
      expect(botaoExportar).toBeDisabled()
    })

    it('deve exibir erro se exportação falhar', async () => {
      const user = userEvent.setup()
      
      const { ExcelService } = await import('../../services/excelService')
      vi.mocked(ExcelService.exportarRegistrosPonto).mockRejectedValueOnce(
        new Error('Erro na exportação')
      )

      renderWithProviders(<RegistrosPage />)

      const botaoExportar = screen.getByRole('button', { name: /exportar excel/i })
      await user.click(botaoExportar)

      await waitFor(() => {
        expect(screen.getByText(/erro ao exportar/i)).toBeInTheDocument()
      })
    })
  })

  describe('Tratamento de erros', () => {
    it('deve exibir erro quando falha ao carregar registros', async () => {
      mockApiResponses.listarRegistros.mockRejectedValueOnce(
        new Error('Erro de conexão')
      )

      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar registros/i)).toBeInTheDocument()
      })
    })

    it('deve permitir retry após erro', async () => {
      const user = userEvent.setup()
      
      mockApiResponses.listarRegistros
        .mockRejectedValueOnce(new Error('Erro'))
        .mockResolvedValueOnce({
          data: { success: true, registros: mockRegistros }
        })

      renderWithProviders(<RegistrosPage />)

      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument()
      })

      const botaoRetry = screen.getByRole('button', { name: /tentar novamente/i })
      await user.click(botaoRetry)

      await waitFor(() => {
        expect(screen.getByText('João Silva')).toBeInTheDocument()
      })
    })

    it('deve tratar erro de validação de filtros', async () => {
      const user = userEvent.setup()
      
      mockApiResponses.listarRegistros.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: 'Período inválido' }
        }
      })

      renderWithProviders(<RegistrosPage />)

      const botaoFiltrar = screen.getByRole('button', { name: /filtrar/i })
      await user.click(botaoFiltrar)

      await waitFor(() => {
        expect(screen.getByText(/período inválido/i)).toBeInTheDocument()
      })
    })
  })

  describe('Atualizações em tempo real', () => {
    it('deve atualizar lista automaticamente', async () => {
      vi.useFakeTimers()
      
      renderWithProviders(<RegistrosPage />)

      // Aguardar carregamento inicial
      await waitFor(() => {
        expect(mockApiResponses.listarRegistros).toHaveBeenCalledTimes(1)
      })

      // Avançar tempo para trigger auto-refresh
      vi.advanceTimersByTime(60000) // 1 minuto

      await waitFor(() => {
        expect(mockApiResponses.listarRegistros).toHaveBeenCalledTimes(2)
      })

      vi.useRealTimers()
    })

    it('deve pausar auto-refresh quando filtros estão ativos', async () => {
      const user = userEvent.setup()
      vi.useFakeTimers()
      
      renderWithProviders(<RegistrosPage />)

      // Aplicar filtro
      const dataInicial = screen.getByLabelText(/data inicial/i)
      await user.type(dataInicial, '2025-01-10')
      
      const botaoFiltrar = screen.getByRole('button', { name: /filtrar/i })
      await user.click(botaoFiltrar)

      await waitFor(() => {
        expect(mockApiResponses.listarRegistros).toHaveBeenCalledTimes(2)
      })

      // Avançar tempo - não deve fazer auto-refresh com filtros ativos
      vi.advanceTimersByTime(60000)

      expect(mockApiResponses.listarRegistros).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })
  })
}) 