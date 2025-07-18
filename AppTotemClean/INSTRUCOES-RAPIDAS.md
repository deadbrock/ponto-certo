# Instruções Rápidas - Problema CLI

## O Problema
O React Native não encontra o CLI mesmo estando no package.json. Isso acontece porque as dependências não foram reinstaladas após a atualização.

## Soluções (execute uma delas):

### 🚀 Opção 1 - Script Automático (RECOMENDADO)
```bash
force-install.bat
```

### ⚡ Opção 2 - Script Rápido
```bash
quick-fix.bat
```

### 🔧 Opção 3 - Comandos Manuais
```bash
# Remover tudo
rmdir /s /q node_modules
del package-lock.json

# Limpar cache
npm cache clean --force

# Reinstalar tudo
npm install --force

# Testar
npm run android
```

### 🛠️ Opção 4 - Apenas CLI
```bash
npm install @react-native-community/cli@13.6.0 --save-dev --force
npm run android
```

## Status Atual
- ✅ package.json atualizado com CLI 13.6.0
- ✅ React Native atualizado para 0.73.11
- ✅ Vulnerabilidades de segurança corrigidas
- ❌ Dependências precisam ser reinstaladas

## Próximo Passo
Execute `force-install.bat` e aguarde a instalação completa. 