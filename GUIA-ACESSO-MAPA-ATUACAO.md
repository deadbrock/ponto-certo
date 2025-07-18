# 🗺️ Guia de Acesso - Mapa de Atuação

## Resumo
A funcionalidade **Mapa de Atuação** foi implementada com sucesso no módulo Contratos e deve estar disponível no painel web.

## Como Acessar

### 1. Verificar Perfil de Usuário
A funcionalidade só é visível para usuários com perfis específicos:
- ✅ **Administrador** - Acesso total
- ✅ **RH** - Acesso total  
- ❌ **Gestor** - Sem acesso

### 2. Localização no Menu
1. Faça login no painel web
2. No menu lateral (Sidebar), procure pelo item **"Contratos"**
3. Abaixo do item Contratos, deve aparecer um submenu:
   - 🗺️ **Mapa de Atuação** (indentado à direita)

### 3. URL Direta
Se não aparecer no menu, acesse diretamente:
```
http://localhost:3000/contratos/mapa
```

## Possíveis Problemas

### Problema 1: Não Aparece no Menu
**Causa**: Perfil de usuário incorreto
**Solução**: Verifique se está logado com perfil 'Administrador' ou 'RH'

**Teste rápido**:
1. Abra o Console do navegador (F12)
2. Digite: `localStorage.getItem('token')`
3. Se não houver token, faça login novamente

### Problema 2: Erro ao Carregar
**Causa**: Dependências não instaladas
**Solução**: Execute no terminal:
```bash
cd painel-web
npm install react-simple-maps axios --legacy-peer-deps
npm start
```

### Problema 3: Página em Branco
**Causa**: Erro de JavaScript
**Solução**: 
1. Abra Console do navegador (F12)
2. Procure por erros em vermelho
3. Se houver erro com 'react-simple-maps', as dependências estão incorretas

## Funcionalidades Disponíveis

### Visualização
- ✅ Mapa interativo do Brasil
- ✅ Estados coloridos por status de contrato
- ✅ Tooltips com informações detalhadas
- ✅ 4 cards de resumo (KPIs)

### Interação
- ✅ Clique em estados para ver detalhes
- ✅ Filtros avançados (status, cliente, período)
- ✅ Drawer lateral com lista de contratos
- ✅ Responsivo para mobile

### Dados Mock
- ✅ 11 estados com contratos
- ✅ R$ 21.275.000 em contratos
- ✅ 4.215 funcionários
- ✅ Dados realistas para demonstração

## Debug e Logs

Se ainda não funcionar, verifique os logs no Console:
1. Abra F12 → Console
2. Acesse `/contratos/mapa`
3. Procure por:
   - 🗺️ "MapaAtuacao: Componente carregado"
   - 👤 "Usuário atual:"
   - 🔒 "Perfil do usuário:"
   - ✅ "Pode acessar mapa:"

## Credenciais de Teste

Use estas credenciais para testar:

### Administrador (Acesso Total)
- **Email**: admin@fgservices.com
- **Senha**: admin123

### RH (Acesso Total)
- **Email**: rh@fgservices.com  
- **Senha**: rh123

### Gestor (Sem Acesso)
- **Email**: gestor@fgservices.com
- **Senha**: gestor123

## Arquivos Implementados

### Componentes
- `src/components/contratos/mapa/MapaAtuacao.tsx` - Componente principal
- `src/components/contratos/mapa/MapaBrasil.tsx` - Mapa SVG interativo

### Serviços
- `src/services/mapaService.ts` - API service com dados mock

### Rotas
- `/contratos/mapa` - Rota configurada em `App.tsx`
- Menu configurado em `Sidebar.tsx`

## Status da Implementação

✅ **Componentes**: 100% implementado
✅ **Rotas**: 100% configurado  
✅ **Menu**: 100% integrado
✅ **Responsividade**: 100% funcional
✅ **Dados Mock**: 100% realistas
✅ **Controle de Acesso**: 100% implementado

---

**Se ainda não conseguir ver a funcionalidade, envie um print da tela e das mensagens do Console para mais diagnóstico.** 