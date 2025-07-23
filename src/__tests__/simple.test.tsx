import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Componente simples para teste
const SimpleComponent = ({ text }: { text: string }) => (
  <div data-testid="simple-component">{text}</div>
)

describe('Teste Simples', () => {
  it('deve renderizar componente básico', () => {
    render(<SimpleComponent text="Hello World" />)
    
    expect(screen.getByTestId('simple-component')).toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('deve fazer cálculo básico', () => {
    expect(2 + 2).toBe(4)
  })
}) 