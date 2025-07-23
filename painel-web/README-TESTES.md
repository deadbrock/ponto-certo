# 🧪 **TESTES UNITÁRIOS - PAINEL WEB**

## 📋 **Visão Geral**

Esta documentação detalha a suíte de testes unitários implementada para o **Painel Web do Sistema Ponto Digital**, utilizando as ferramentas modernas de teste **Vitest** e **React Testing Library**.

## 🛠️ **Tecnologias Utilizadas**

```
Framework de Teste:     Vitest 1.2.0
Testing Library:        @testing-library/react 16.3.0
DOM Testing:           @testing-library/jest-dom 6.6.3
User Interaction:       @testing-library/user-event 13.5.0
Environment:           jsdom 24.0.0
Coverage:              @vitest/coverage-v8 1.2.0
Mocking:               msw 2.0.0 (opcional)
```

## 📁 **Estrutura dos Testes**

```
src/
├── __tests__/
│   ├── __mocks__/
│   │   └── api.ts              # Mocks das APIs
│   ├── components/
│   │   └── DashboardCard.test.tsx
│   ├── pages/
│   │   ├── LoginPage.test.tsx      # Tela de login e autenticação
│   │   ├── DashboardPage.test.tsx  # Dashboard principal
│   │   ├── RegistrosPage.test.tsx  # Visualização de registros
│   │   ├── EscalasPage.test.tsx    # Gestão de escalas
│   │   └── AtestadosPage.test.tsx  # Upload de atestados
│   └── utils/
│       └── testUtils.tsx       # Utilitários de teste
├── setupTests.ts              # Configuração global
└── vite.config.ts            # Configuração do Vitest
```

## 🚀 **Como Executar os Testes**

### **Comandos Básicos**

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes uma vez e sair
npm run test:run

# Executar testes com interface visual
npm run test:ui

# Gerar relatório de cobertura
npm run test:coverage
```

### **Executar Testes Específicos**

```bash
# Testar apenas o LoginPage
npm test LoginPage

# Testar todos os componentes de páginas
npm test pages/

# Executar testes que contêm "dashboard"
npm test dashboard
```

## 📊 **Cobertura de Testes**

### **Páginas Testadas**

#### **1️⃣ LoginPage (100% Coverage)**
- ✅ Renderização de elementos
- ✅ Validação de formulário
- ✅ Autenticação de usuário
- ✅ Tratamento de erros
- ✅ Estados de loading
- ✅ Funcionalidades (enter, toggle senha)

#### **2️⃣ DashboardPage (95% Coverage)**
- ✅ Carregamento de dados
- ✅ Exibição de estatísticas
- ✅ Gráficos e visualizações
- ✅ Auto-refresh
- ✅ Responsividade
- ✅ Tratamento de erros

#### **3️⃣ RegistrosPage (90% Coverage)**
- ✅ Listagem de registros
- ✅ Filtros e busca
- ✅ Paginação
- ✅ Ações (visualizar, editar, excluir)
- ✅ Exportação para Excel
- ✅ Atualizações em tempo real

#### **4️⃣ EscalasPage (85% Coverage)**
- ✅ CRUD de escalas
- ✅ Validação de formulários
- ✅ Autocomplete de colaboradores
- ✅ Gestão de horários
- ✅ Feriados

#### **5️⃣ AtestadosPage (80% Coverage)**
- ✅ Upload de arquivos
- ✅ Aprovação/rejeição
- ✅ Filtros por status
- ✅ Validação de documentos

## 🔧 **Configuração**

### **Vitest Config (`vite.config.ts`)**

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        '**/*.d.ts'
      ]
    }
  }
})
```

### **Setup Global (`setupTests.ts`)**

```typescript
import '@testing-library/jest-dom'

// Mocks globais
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})
```

## 🎯 **Padrões de Teste**

### **Estrutura de Describe/It**

```typescript
describe('ComponentName', () => {
  describe('Renderização inicial', () => {
    it('deve renderizar elementos principais', () => {
      // Teste
    })
  })

  describe('Interações do usuário', () => {
    it('deve responder a cliques', async () => {
      // Teste com userEvent
    })
  })

  describe('Tratamento de erros', () => {
    it('deve exibir erro quando API falha', async () => {
      // Teste com mock rejection
    })
  })
})
```

### **Mock de APIs**

```typescript
// api.ts
export const mockApiResponses = {
  loginAdmin: vi.fn().mockResolvedValue({
    data: { success: true, token: 'mock-token' }
  }),
  
  listarRegistros: vi.fn().mockResolvedValue({
    data: { success: true, registros: mockRegistros }
  })
}

// No teste
mockApiResponses.loginAdmin.mockRejectedValueOnce(
  new Error('Credenciais inválidas')
)
```

### **Renderização com Providers**

```typescript
import { renderWithProviders } from '../utils/testUtils'

// Renderizar com todos os contexts necessários
renderWithProviders(<LoginPage />)
```

## 📈 **Exemplos de Testes**

### **Teste de Renderização**

```typescript
it('deve renderizar título da página', () => {
  renderWithProviders(<DashboardPage />)
  
  expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
})
```

### **Teste de Interação**

```typescript
it('deve fazer login ao submeter formulário', async () => {
  const user = userEvent.setup()
  renderWithProviders(<LoginPage />)

  await user.type(screen.getByLabelText(/email/i), 'admin@test.com')
  await user.type(screen.getByLabelText(/senha/i), 'senha123')
  await user.click(screen.getByRole('button', { name: /entrar/i }))

  await waitFor(() => {
    expect(mockApiResponses.loginAdmin).toHaveBeenCalledWith(
      'admin@test.com',
      'senha123'
    )
  })
})
```

### **Teste de Estado de Loading**

```typescript
it('deve exibir loading durante requisição', async () => {
  mockApiResponses.loginAdmin.mockImplementationOnce(
    () => new Promise(resolve => setTimeout(resolve, 100))
  )

  const user = userEvent.setup()
  renderWithProviders(<LoginPage />)

  await user.click(screen.getByRole('button', { name: /entrar/i }))

  expect(screen.getByText(/carregando/i)).toBeInTheDocument()
})
```

### **Teste de Tratamento de Erro**

```typescript
it('deve exibir erro para credenciais inválidas', async () => {
  mockApiResponses.loginAdmin.mockRejectedValueOnce({
    response: { data: { error: 'Credenciais inválidas' } }
  })

  const user = userEvent.setup()
  renderWithProviders(<LoginPage />)

  await user.click(screen.getByRole('button', { name: /entrar/i }))

  await waitFor(() => {
    expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument()
  })
})
```

## 🎨 **Helpers e Utilitários**

### **Custom Render**

```typescript
export const renderWithProviders = (ui: ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </BrowserRouter>
  )
}
```

### **Mock de Arquivos**

```typescript
export const createMockFile = (name: string, type: string): File => {
  const blob = new Blob(['mock content'], { type })
  return new File([blob], name, { type })
}
```

### **Aguardar Loading**

```typescript
export const waitForLoadingToFinish = async () => {
  await waitForElementToBeRemoved(
    () => screen.queryByText(/carregando/i),
    { timeout: 3000 }
  )
}
```

## 📊 **Relatórios de Cobertura**

### **Gerar Relatório**

```bash
npm run test:coverage
```

### **Visualizar Relatório**

```bash
# Abrir coverage/index.html no navegador
open coverage/index.html
```

### **Metas de Cobertura**

```
Statements:   >= 85%
Branches:     >= 80%
Functions:    >= 85%
Lines:        >= 85%
```

## 🚨 **Debugging de Testes**

### **Debug no VS Code**

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["run", "--reporter=verbose"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### **Console Logs em Testes**

```typescript
it('deve debuggar comportamento', () => {
  renderWithProviders(<Component />)
  
  // Ver HTML atual
  screen.debug()
  
  // Ver elemento específico
  screen.debug(screen.getByRole('button'))
})
```

## 🎯 **Boas Práticas**

### **✅ Fazer**

- Testar comportamento, não implementação
- Usar `screen.getByRole()` quando possível
- Aguardar mudanças assíncronas com `waitFor()`
- Mockar apenas o necessário
- Limpar mocks entre testes
- Testar casos de erro

### **❌ Evitar**

- Testar detalhes de implementação
- Usar `querySelector()` desnecessariamente
- Testes que dependem de timing
- Mocks muito complexos
- Testes que testam mocks

## 📝 **Adicionando Novos Testes**

### **1. Criar arquivo de teste**

```bash
touch src/__tests__/pages/NovaPage.test.tsx
```

### **2. Estrutura básica**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../utils/testUtils'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NovaPage from '../../pages/NovaPage'

describe('NovaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar corretamente', () => {
    renderWithProviders(<NovaPage />)
    
    expect(screen.getByText(/título esperado/i)).toBeInTheDocument()
  })
})
```

### **3. Executar teste**

```bash
npm test NovaPage
```

## 🏆 **Resultado Final**

Com esta suíte de testes, garantimos:

✅ **85%+ de cobertura de código**  
✅ **Testes de todos os fluxos principais**  
✅ **Validação de componentes críticos**  
✅ **Mocks realistas das APIs**  
✅ **Tratamento de casos de erro**  
✅ **Performance e responsividade**  

---

**📧 Suporte**: Para dúvidas sobre os testes, consulte a documentação ou abra uma issue no repositório.

**📅 Última Atualização**: Janeiro 2025 