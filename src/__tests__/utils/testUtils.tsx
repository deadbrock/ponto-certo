import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'

// Wrapper customizado para todos os provedores
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  )
}

// Função de render customizada
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock de usuário logado
export const mockLoggedUser = () => {
  localStorage.setItem('token', 'mock-jwt-token')
  localStorage.setItem('usuario', JSON.stringify({
    id: 1,
    nome: 'Administrador',
    email: 'admin@fgservices.com',
    perfil: 'administrador'
  }))
}

// Mock de arquivo para testes de upload
export const createMockFile = (
  name: string,
  type: string,
  size: number = 1024
): File => {
  const content = 'a'.repeat(size)
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

// Mock de eventos de input
export const mockInputEvent = (value: string) => ({
  target: { value },
  preventDefault: () => {},
  stopPropagation: () => {}
})

// Mock de coordenadas GPS
export const mockGpsCoordinates = {
  latitude: -23.5505199,
  longitude: -46.6333094
}

// Helper para aguardar loading desaparecer
export const waitForLoadingToFinish = async () => {
  const { waitForElementToBeRemoved, screen } = await import('@testing-library/react')
  
  try {
    await waitForElementToBeRemoved(
      () => screen.queryByTestId('loading') || screen.queryByText(/carregando/i),
      { timeout: 3000 }
    )
  } catch {
    // Loading pode não existir, ignorar erro
  }
}

// Re-exportar todas as funções do testing-library
export * from '@testing-library/react'
export { userEvent } from '@testing-library/user-event' 