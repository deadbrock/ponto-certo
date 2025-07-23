import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from '../../pages/LoginPage'
import { AuthProvider } from '../../contexts/AuthContext'
import { mockApiResponses, mockAxios } from '../__mocks__/api'

// Mock do módulo de API
vi.mock('../../services/api', () => ({
  api: mockAxios,
  loginApi: mockApiResponses.loginAdmin
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

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Renderização inicial', () => {
    it('deve renderizar todos os elementos da tela de login', () => {
      renderWithProviders(<LoginPage />)

      // Verificar se o título está presente
      expect(screen.getByText(/sistema de ponto digital/i)).toBeInTheDocument()
      
      // Verificar se os campos de entrada estão presentes
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
      
      // Verificar se o botão de login está presente
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
    })

    it('deve exibir placeholders corretos nos campos', () => {
      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      const senhaInput = screen.getByLabelText(/senha/i) as HTMLInputElement

      expect(emailInput.placeholder).toBe('Digite seu email')
      expect(senhaInput.placeholder).toBe('Digite sua senha')
    })

    it('deve ter o campo senha como tipo password', () => {
      renderWithProviders(<LoginPage />)

      const senhaInput = screen.getByLabelText(/senha/i) as HTMLInputElement
      expect(senhaInput.type).toBe('password')
    })
  })

  describe('Validação de campos', () => {
    it('deve exibir erro quando campos estão vazios', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)

      const botaoEntrar = screen.getByRole('button', { name: /entrar/i })
      await user.click(botaoEntrar)

      await waitFor(() => {
        expect(screen.getByText(/email é obrigatório/i)).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText(/senha é obrigatória/i)).toBeInTheDocument()
      })
    })

    it('deve validar formato do email', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const botaoEntrar = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'email-invalido')
      await user.click(botaoEntrar)

      await waitFor(() => {
        expect(screen.getByText(/email inválido/i)).toBeInTheDocument()
      })
    })

    it('deve validar tamanho mínimo da senha', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const senhaInput = screen.getByLabelText(/senha/i)
      const botaoEntrar = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'admin@fgservices.com')
      await user.type(senhaInput, '123')
      await user.click(botaoEntrar)

      await waitFor(() => {
        expect(screen.getByText(/senha deve ter pelo menos 6 caracteres/i)).toBeInTheDocument()
      })
    })
  })

  describe('Autenticação', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const senhaInput = screen.getByLabelText(/senha/i)
      const botaoEntrar = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'admin@fgservices.com')
      await user.type(senhaInput, 'admin123')
      await user.click(botaoEntrar)

      await waitFor(() => {
        expect(mockApiResponses.loginAdmin).toHaveBeenCalledWith(
          'admin@fgservices.com',
          'admin123'
        )
      })
    })

    it('deve exibir loading durante o login', async () => {
      const user = userEvent.setup()
      
      // Mock para simular demora na resposta
      mockApiResponses.loginAdmin.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { success: true, token: 'token', usuario: { id: 1, nome: 'Admin' } }
        }), 100))
      )

      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const senhaInput = screen.getByLabelText(/senha/i)
      const botaoEntrar = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'admin@fgservices.com')
      await user.type(senhaInput, 'admin123')
      await user.click(botaoEntrar)

      // Verificar se o loading aparece
      expect(screen.getByText(/carregando/i)).toBeInTheDocument()
      expect(botaoEntrar).toBeDisabled()
    })

    it('deve salvar token no localStorage após login bem-sucedido', async () => {
      const user = userEvent.setup()
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const senhaInput = screen.getByLabelText(/senha/i)
      const botaoEntrar = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'admin@fgservices.com')
      await user.type(senhaInput, 'admin123')
      await user.click(botaoEntrar)

      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledWith('token', 'mock-jwt-token')
      })
    })
  })

  describe('Tratamento de erros', () => {
    it('deve exibir erro para credenciais inválidas', async () => {
      const user = userEvent.setup()
      
      // Mock para simular erro de autenticação
      mockApiResponses.loginAdmin.mockRejectedValueOnce({
        response: {
          data: { error: 'Credenciais inválidas' },
          status: 401
        }
      })

      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const senhaInput = screen.getByLabelText(/senha/i)
      const botaoEntrar = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'wrong@email.com')
      await user.type(senhaInput, 'wrongpassword')
      await user.click(botaoEntrar)

      await waitFor(() => {
        expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument()
      })
    })

    it('deve exibir erro genérico para falhas de rede', async () => {
      const user = userEvent.setup()
      
      // Mock para simular erro de rede
      mockApiResponses.loginAdmin.mockRejectedValueOnce(new Error('Network Error'))

      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const senhaInput = screen.getByLabelText(/senha/i)
      const botaoEntrar = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'admin@fgservices.com')
      await user.type(senhaInput, 'admin123')
      await user.click(botaoEntrar)

      await waitFor(() => {
        expect(screen.getByText(/erro de conexão/i)).toBeInTheDocument()
      })
    })

    it('deve limpar mensagem de erro ao digitar novamente', async () => {
      const user = userEvent.setup()
      
      // Primeiro, simular um erro
      mockApiResponses.loginAdmin.mockRejectedValueOnce({
        response: { data: { error: 'Credenciais inválidas' } }
      })

      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const senhaInput = screen.getByLabelText(/senha/i)
      const botaoEntrar = screen.getByRole('button', { name: /entrar/i })

      // Fazer login com erro
      await user.type(emailInput, 'wrong@email.com')
      await user.type(senhaInput, 'wrongpassword')
      await user.click(botaoEntrar)

      await waitFor(() => {
        expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument()
      })

      // Digitar no campo email novamente
      await user.clear(emailInput)
      await user.type(emailInput, 'admin@fgservices.com')

      // Verificar se o erro foi limpo
      expect(screen.queryByText(/credenciais inválidas/i)).not.toBeInTheDocument()
    })
  })

  describe('Funcionalidades adicionais', () => {
    it('deve permitir login pressionando Enter', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const senhaInput = screen.getByLabelText(/senha/i)

      await user.type(emailInput, 'admin@fgservices.com')
      await user.type(senhaInput, 'admin123')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockApiResponses.loginAdmin).toHaveBeenCalled()
      })
    })

    it('deve mostrar/ocultar senha ao clicar no ícone', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)

      const senhaInput = screen.getByLabelText(/senha/i) as HTMLInputElement
      const toggleButton = screen.getByRole('button', { name: /mostrar senha/i })

      // Inicialmente deve ser tipo password
      expect(senhaInput.type).toBe('password')

      // Clicar para mostrar
      await user.click(toggleButton)
      expect(senhaInput.type).toBe('text')

      // Clicar para ocultar novamente
      await user.click(toggleButton)
      expect(senhaInput.type).toBe('password')
    })

    it('deve manter valores dos campos após erro', async () => {
      const user = userEvent.setup()
      
      mockApiResponses.loginAdmin.mockRejectedValueOnce({
        response: { data: { error: 'Erro qualquer' } }
      })

      renderWithProviders(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      const senhaInput = screen.getByLabelText(/senha/i) as HTMLInputElement
      const botaoEntrar = screen.getByRole('button', { name: /entrar/i })

      await user.type(emailInput, 'admin@fgservices.com')
      await user.type(senhaInput, 'admin123')
      await user.click(botaoEntrar)

      await waitFor(() => {
        expect(screen.getByText(/erro qualquer/i)).toBeInTheDocument()
      })

      // Verificar se os valores foram mantidos
      expect(emailInput.value).toBe('admin@fgservices.com')
      expect(senhaInput.value).toBe('admin123')
    })
  })
}) 