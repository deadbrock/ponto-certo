import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import DashboardPage from '../../pages/DashboardPage'
import { AuthProvider } from '../../contexts/AuthContext'
import { mockApiResponses, mockAxios, mockEstatisticas, mockRegistros } from '../__mocks__/api'

// Mock do módulo de API
vi.mock('../../services/api', () => ({
  api: mockAxios
}))

// Mock do Chart.js
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>
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

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock do usuário logado
    localStorage.setItem('token', 'mock-token')
    vi.mocked(localStorage.getItem).mockReturnValue('mock-token')
  })

  describe('Carregamento inicial', () => {
    it('deve exibir loading enquanto carrega os dados', () => {
      // Mock com demora na resposta
      mockApiResponses.obterEstatisticas.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      renderWithProviders(<DashboardPage />)

      expect(screen.getByText(/carregando dados/i)).toBeInTheDocument()
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument()
    })

    it('deve carregar dados das APIs corretas na inicialização', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(mockApiResponses.obterEstatisticas).toHaveBeenCalledWith('/dashboard/estatisticas')
        expect(mockApiResponses.obterRegistrosRecentes).toHaveBeenCalledWith('/dashboard/registros-recentes')
      })
    })
  })

  describe('Exibição de estatísticas', () => {
    it('deve renderizar todos os cards de estatísticas', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        mockEstatisticas.forEach(stat => {
          expect(screen.getByText(stat.title)).toBeInTheDocument()
          expect(screen.getByText(stat.value.toString())).toBeInTheDocument()
          expect(screen.getByText(stat.trend)).toBeInTheDocument()
        })
      })
    })

    it('deve aplicar cores corretas nos cards', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        const colaboradoresCard = screen.getByTestId('stat-card-colaboradores')
        const registrosCard = screen.getByTestId('stat-card-registros')
        const presencaCard = screen.getByTestId('stat-card-presenca')
        const alertasCard = screen.getByTestId('stat-card-alertas')

        expect(colaboradoresCard).toHaveClass('stat-card-primary')
        expect(registrosCard).toHaveClass('stat-card-success')
        expect(presencaCard).toHaveClass('stat-card-info')
        expect(alertasCard).toHaveClass('stat-card-warning')
      })
    })

    it('deve exibir trends com ícones corretos', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        // Verificar ícones de trend positivo
        expect(screen.getByTestId('trend-up-colaboradores')).toBeInTheDocument()
        expect(screen.getByTestId('trend-up-registros')).toBeInTheDocument()
        
        // Verificar ícone de trend negativo (alertas)
        expect(screen.getByTestId('trend-down-alertas')).toBeInTheDocument()
      })
    })
  })

  describe('Registros recentes', () => {
    it('deve exibir lista de registros recentes', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/registros recentes/i)).toBeInTheDocument()
        
        mockRegistros.forEach(registro => {
          expect(screen.getByText(registro.colaborador_nome)).toBeInTheDocument()
          expect(screen.getByText(registro.tipo_registro)).toBeInTheDocument()
        })
      })
    })

    it('deve formatar horários corretamente', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        // Verificar se os horários estão formatados (08:00, 08:15)
        expect(screen.getByText('08:00')).toBeInTheDocument()
        expect(screen.getByText('08:15')).toBeInTheDocument()
      })
    })

    it('deve exibir tipos de registro com cores diferentes', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        const entradaChips = screen.getAllByText('entrada')
        entradaChips.forEach(chip => {
          expect(chip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess')
        })
      })
    })

    it('deve exibir mensagem quando não há registros', async () => {
      // Mock com array vazio
      mockApiResponses.obterRegistrosRecentes.mockResolvedValueOnce({
        data: { success: true, registros: [] }
      })

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/nenhum registro encontrado/i)).toBeInTheDocument()
      })
    })
  })

  describe('Gráficos', () => {
    it('deve renderizar gráfico de presença mensal', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
        expect(screen.getByText(/presença últimos 30 dias/i)).toBeInTheDocument()
      })
    })

    it('deve renderizar gráfico de tipos de batida', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument()
        expect(screen.getByText(/tipos de registro/i)).toBeInTheDocument()
      })
    })
  })

  describe('Ações do usuário', () => {
    it('deve navegar para registros ao clicar no card', async () => {
      const user = userEvent.setup()
      const mockNavigate = vi.fn()
      
      // Mock do useNavigate
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom')
        return {
          ...actual,
          useNavigate: () => mockNavigate
        }
      })

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        const registrosCard = screen.getByTestId('stat-card-registros')
        user.click(registrosCard)
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/registros')
      })
    })

    it('deve atualizar dados ao clicar no botão refresh', async () => {
      const user = userEvent.setup()
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        const refreshButton = screen.getByTestId('refresh-button')
        user.click(refreshButton)
      })

      await waitFor(() => {
        // Verificar se as APIs foram chamadas novamente
        expect(mockApiResponses.obterEstatisticas).toHaveBeenCalledTimes(2)
        expect(mockApiResponses.obterRegistrosRecentes).toHaveBeenCalledTimes(2)
      })
    })

    it('deve exportar relatório ao clicar no botão', async () => {
      const user = userEvent.setup()
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /exportar relatório/i })
        user.click(exportButton)
      })

      // Verificar se modal de exportação abriu
      await waitFor(() => {
        expect(screen.getByText(/exportar dashboard/i)).toBeInTheDocument()
      })
    })
  })

  describe('Tratamento de erros', () => {
    it('deve exibir erro quando falha ao carregar estatísticas', async () => {
      mockApiResponses.obterEstatisticas.mockRejectedValueOnce(
        new Error('Erro ao carregar dados')
      )

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar dados do servidor/i)).toBeInTheDocument()
      })
    })

    it('deve exibir valores padrão quando API retorna dados inválidos', async () => {
      mockApiResponses.obterEstatisticas.mockResolvedValueOnce({
        data: { success: true, stats: null }
      })

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        // Verificar se valores padrão são exibidos
        expect(screen.getByText('0')).toBeInTheDocument() // Colaboradores
        expect(screen.getByText('--')).toBeInTheDocument() // Dados não disponíveis
      })
    })

    it('deve permitir retry após erro', async () => {
      const user = userEvent.setup()
      
      // Primeiro erro, depois sucesso
      mockApiResponses.obterEstatisticas
        .mockRejectedValueOnce(new Error('Erro'))
        .mockResolvedValueOnce({
          data: { success: true, stats: mockEstatisticas }
        })

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar dados/i)).toBeInTheDocument()
      })

      // Clicar no botão de retry
      const retryButton = screen.getByRole('button', { name: /tentar novamente/i })
      await user.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Colaboradores Ativos')).toBeInTheDocument()
      })
    })
  })

  describe('Auto-refresh', () => {
    it('deve atualizar dados automaticamente a cada 30 segundos', async () => {
      vi.useFakeTimers()
      
      renderWithProviders(<DashboardPage />)

      // Aguardar carregamento inicial
      await waitFor(() => {
        expect(mockApiResponses.obterEstatisticas).toHaveBeenCalledTimes(1)
      })

      // Avançar 30 segundos
      vi.advanceTimersByTime(30000)

      await waitFor(() => {
        expect(mockApiResponses.obterEstatisticas).toHaveBeenCalledTimes(2)
      })

      vi.useRealTimers()
    })

    it('deve parar auto-refresh quando componente é desmontado', async () => {
      vi.useFakeTimers()
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      
      const { unmount } = renderWithProviders(<DashboardPage />)

      // Desmontar componente
      unmount()

      // Verificar se clearInterval foi chamado
      expect(clearIntervalSpy).toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('Responsividade', () => {
    it('deve adaptar layout para telas pequenas', async () => {
      // Simular tela pequena
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        const container = screen.getByTestId('dashboard-container')
        expect(container).toHaveClass('mobile-layout')
      })
    })

    it('deve manter layout desktop para telas grandes', async () => {
      // Simular tela grande
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        const container = screen.getByTestId('dashboard-container')
        expect(container).toHaveClass('desktop-layout')
      })
    })
  })
}) 