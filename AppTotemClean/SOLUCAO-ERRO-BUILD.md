# Solução para Erro de Build - React Native Screens

## Problema
Erro de compilação do Kotlin com `react-native-screens` devido a incompatibilidades de versão.

## Solução Passo a Passo

### 1. Execute o script de limpeza
```bash
# No diretório AppTotemClean
clean-install.bat
```

### 2. Se o script não funcionar, execute manualmente:
```bash
# Remover node_modules
rmdir /s /q node_modules

# Limpar caches
npm cache clean --force
npx react-native clean

# Reinstalar dependências
npm install

# Limpar build do Android
cd android
rmdir /s /q .gradle
rmdir /s /q build
cd app
rmdir /s /q build
cd ../..
```

### 3. Verificar versões das dependências
As seguintes versões foram configuradas para compatibilidade:
- react-native: 0.73.11 (atualizada para corrigir vulnerabilidades)
- react-native-screens: 3.20.0
- react-native-safe-area-context: 4.6.0
- react-native-gesture-handler: 2.12.0
- react-native-reanimated: 3.3.0
- @react-native-community/cli: 13.6.0

### 4. Tentar build novamente
```bash
npm run android
```

## Correção de Vulnerabilidades de Segurança

### Problema de Segurança
Vulnerabilidade SSRF na biblioteca `ip` detectada pelo npm audit.

### Solução Aplicada
1. **Atualizado React Native** para versão 0.73.11
2. **Atualizado CLI** para versão 13.6.0 (compatível e segura)
3. **Adicionado override** para forçar versão segura da biblioteca `ip`

### Script de Correção
```bash
# Execute para corrigir vulnerabilidades
fix-security.bat
```

### Verificação Manual
```bash
# Verificar vulnerabilidades
npm audit

# Aplicar correções automáticas se necessário
npm audit fix --force
```

## Alternativa: Versão Simplificada

Se o erro persistir, foi criada uma versão simplificada do App.tsx que não usa navegação complexa, funcionando com apenas:
- Tela principal (menu)
- Tela de câmera
- Tela de configurações

Esta versão usa navegação por estado simples em vez do React Navigation.

## Configurações Atualizadas

### Android Build
- minSdkVersion: 26
- kotlinVersion: 1.9.0
- gradle: 8.1.1

### Babel
Configurado com plugin do Reanimated:
```js
plugins: ['react-native-reanimated/plugin']
```

### Segurança
- Biblioteca `ip` atualizada para versão 2.0.1
- React Native atualizado para 0.73.11
- CLI atualizado para 13.6.0

## Próximos Passos

1. Execute a correção de segurança: `fix-security.bat`
2. Verifique se não há mais vulnerabilidades: `npm audit`
3. Tente o build: `npm run android`
4. Se falhar, use a versão simplificada do app

## Contato
Se o problema persistir, verifique:
- Versão do Android Studio
- Versão do JDK (deve ser 17)
- Configurações do SDK do Android
- Execute `npm audit` para verificar vulnerabilidades 