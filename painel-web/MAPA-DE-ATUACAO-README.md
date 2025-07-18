# 🗺️ Componente Mapa de Atuação

## Descrição
Componente React que exibe um mapa interativo do Brasil usando `react-simple-maps`, mostrando a distribuição de contratos por estado com cores baseadas no status e funcionalidades interativas completas.

## 🚀 Funcionalidades

### ✅ Funcionalidades Implementadas
- **Mapa Interativo**: Visualização completa do território brasileiro
- **Zoom e Pan**: Controles de navegação com mouse e botões
- **Tooltips Informativos**: Detalhes ao passar o mouse
- **Painel Lateral**: Drawer com informações detalhadas do estado
- **Legenda Visual**: Cores por status de contrato
- **Dados Mock**: API simulada com dados de demonstração
- **Design Responsivo**: Adaptável para mobile e desktop
- **Estilização Moderna**: Material-UI com sombras e bordas

### 🎨 Sistema de Cores
- **🟢 Verde (#2ecc71)**: Contratos Ativos
- **🟠 Laranja (#f39c12)**: Próximo do Vencimento  
- **🔴 Vermelho (#e74c3c)**: Contratos Vencidos
- **⚪ Cinza (#ecf0f1)**: Sem Contratos

## 📋 Como Usar

### Importação Básica
```tsx
import MapaDeAtuacao from './components/MapaDeAtuacao';

function MinhaPage() {
  return (
    <div>
      <MapaDeAtuacao height={600} />
    </div>
  );
}
```

### Props Disponíveis
```tsx
interface MapaDeAtuacaoProps {
  height?: number; // Altura do mapa em pixels (padrão: 600)
}
```

### Exemplo Completo
```tsx
import React from 'react';
import { Container } from '@mui/material';
import MapaDeAtuacao from './components/MapaDeAtuacao';

const ContratsPage = () => {
  return (
    <Container maxWidth="xl">
      <MapaDeAtuacao height={700} />
    </Container>
  );
};
```

## 🔧 Estrutura de Dados

### Interface ContractStatus
```tsx
interface ContractStatus {
  uf: string;                    // Sigla do estado (SP, RJ, etc.)
  estado: string;               // Nome completo do estado
  status: 'ativo' | 'vencido' | 'proximo_vencimento' | 'sem_contrato';
  totalContratos: number;       // Quantidade de contratos
  valorTotal: number;           // Valor total em reais
}
```

### Dados de Exemplo
```tsx
const exemploContrato = {
  uf: 'SP',
  estado: 'São Paulo',
  status: 'ativo',
  totalContratos: 15,
  valorTotal: 3200000
};
```

## 🌐 Integração com API

### Substituir Dados Mock
Para conectar com API real, substitua no `useEffect`:

```tsx
useEffect(() => {
  // Substituir esta parte pelos dados da API
  const fetchContractData = async () => {
    try {
      const response = await fetch('/api/contratos/por-estado');
      const data = await response.json();
      setContractData(data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setContractData(mockContractData); // Fallback
    }
  };
  
  fetchContractData();
}, []);
```

### Endpoint Esperado
```
GET /api/contratos/por-estado
Response: ContractStatus[]
```

## 📁 Arquivos Criados

### Componentes
- `src/components/MapaDeAtuacao.tsx` - Componente principal
- `src/components/ExemploMapaDeAtuacao.tsx` - Exemplo de uso

### Dependências Utilizadas
- `react-simple-maps` - Biblioteca de mapas
- `@mui/material` - Interface do usuário
- `@mui/icons-material` - Ícones

## 🎯 Funcionalidades Interativas

### Controles de Navegação
- **Zoom In (+)**: Aproximar visualização
- **Zoom Out (-)**: Afastar visualização  
- **Reset (⌖)**: Voltar posição inicial
- **Arrastar**: Mover o mapa com mouse

### Interações do Mouse
- **Hover**: Tooltip com informações do estado
- **Click**: Abrir painel lateral com detalhes
- **Pan**: Arrastar para navegar pelo mapa

### Painel Lateral (Drawer)
- Nome completo do estado
- Status com cor correspondente
- Total de contratos e valor
- Botões de ação (Ver detalhes, Relatórios, Novo contrato)

## 🔄 Próximas Melhorias

### Funcionalidades Futuras
- [ ] Filtros por período
- [ ] Exportação de dados
- [ ] Gráficos integrados
- [ ] Modo escuro
- [ ] Animações de transição
- [ ] Suporte a múltiplos tipos de contrato
- [ ] Integração com relatórios

### Melhorias Técnicas
- [ ] Lazy loading do GeoJSON
- [ ] Cache de dados
- [ ] Tratamento de erros avançado
- [ ] Testes unitários
- [ ] Acessibilidade (ARIA)

## 📱 Responsividade

O componente é totalmente responsivo:
- **Desktop**: Drawer lateral de 400px
- **Mobile**: Drawer em tela cheia
- **Controles**: Adaptáveis ao tamanho da tela
- **Typography**: Escalável conforme breakpoints

## 🛠️ Troubleshooting

### Problemas Comuns

1. **Mapa não carrega**
   - Verificar conexão com internet (GeoJSON externo)
   - Confirmar se `react-simple-maps` está instalado

2. **Estados sem cor**
   - Verificar se UF nos dados corresponde ao GeoJSON
   - Confirmar estrutura dos dados mock/API

3. **Tooltip não aparece**
   - Verificar se eventos de mouse estão habilitados
   - Confirmar dados do estado existem

4. **Drawer não abre**
   - Verificar se estado tem dados de contrato
   - Confirmar função `handleStateClick`

## 📞 Suporte

Para dúvidas ou melhorias, consulte:
- Documentação do `react-simple-maps`
- Material-UI para componentes visuais
- Código fonte nos arquivos criados

---

**Criado para o Painel Web Ponto Digital FG** 🚀 