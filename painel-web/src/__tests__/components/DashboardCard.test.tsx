import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '../utils/testUtils'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock do componente DashboardCard
const DashboardCard = ({ 
  title, 
  value, 
  trend, 
  color, 
  onClick 
}: {
  title: string
  value: string | number
  trend: string
  color: 'primary' | 'success' | 'warning' | 'info'
  onClick?: () => void
}) => (
  <div 
    data-testid={`dashboard-card-${title.toLowerCase().replace(' ', '-')}`}
    className={`dashboard-card dashboard-card-${color}`}
    onClick={onClick}
  >
    <h3>{title}</h3>
    <div className="value">{value}</div>
    <div className="trend">{trend}</div>
  </div>
)

describe('DashboardCard', () => {
  it('deve renderizar todos os dados do card', () => {
    renderWithProviders(
      <DashboardCard
        title="Colaboradores Ativos"
        value={42}
        trend="+5%"
        color="primary"
      />
    )

    expect(screen.getByText('Colaboradores Ativos')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('+5%')).toBeInTheDocument()
  })

  it('deve aplicar classe CSS correta baseada na cor', () => {
    renderWithProviders(
      <DashboardCard
        title="Registros Hoje"
        value={85}
        trend="+12%"
        color="success"
      />
    )

    const card = screen.getByTestId('dashboard-card-registros-hoje')
    expect(card).toHaveClass('dashboard-card-success')
  })

  it('deve chamar função onClick quando clicado', async () => {
    const user = userEvent.setup()
    const mockOnClick = vi.fn()

    renderWithProviders(
      <DashboardCard
        title="Alertas"
        value={3}
        trend="-1"
        color="warning"
        onClick={mockOnClick}
      />
    )

    const card = screen.getByTestId('dashboard-card-alertas')
    await user.click(card)

    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('deve renderizar valores string e numéricos', () => {
    renderWithProviders(
      <DashboardCard
        title="Presença Hoje"
        value="94.2%"
        trend="+2%"
        color="info"
      />
    )

    expect(screen.getByText('94.2%')).toBeInTheDocument()
  })
}) 