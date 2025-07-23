import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock do window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock do IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}))

// Mock do ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}))

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock do sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Mock do window.alert
window.alert = vi.fn()

// Mock do window.confirm
window.confirm = vi.fn()

// Mock do console para evitar logs desnecessários nos testes
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock de módulos problemáticos do Material-UI
vi.mock('@mui/x-date-pickers', () => ({
  DatePicker: ({ value, onChange, label, ...props }: any) => (
    <input
      type="date"
      value={value}
      onChange={onChange}
      placeholder={label}
      data-testid="date-picker"
      {...props}
    />
  ),
  LocalizationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="localization-provider">{children}</div>
  )
}))

// Mock do Chart.js para evitar problemas de canvas
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>
}))

// Mock do FullCalendar
vi.mock('@fullcalendar/react', () => ({
  default: () => <div data-testid="full-calendar">Calendar</div>
}))

// Limpar todos os mocks antes de cada teste
beforeEach(() => {
  vi.clearAllMocks()
}) 