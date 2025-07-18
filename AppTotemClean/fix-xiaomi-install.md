# 🔧 Correção para Dispositivos Xiaomi/MIUI

## 📱 **Dispositivo Detectado: Xiaomi (modelo 25040RP0AL)**

Os dispositivos Xiaomi com **MIUI** têm restrições de segurança específicas que precisam ser ajustadas.

## 🔓 **Passos para Resolver INSTALL_FAILED_USER_RESTRICTED**

### **1. Ativar Modo Desenvolvedor:**
1. Vá em **Configurações** > **Sobre o telefone**
2. Toque **7 vezes** em "**Versão MIUI**" ou "**Número da versão**"
3. Verá a mensagem "Você é agora um desenvolvedor"

### **2. Configurar Opções do Desenvolvedor:**
1. Vá em **Configurações** > **Configurações adicionais** > **Opções do desenvolvedor**
2. **Ativar** as seguintes opções:
   - ✅ **Depuração USB**
   - ✅ **Instalar via USB** 
   - ✅ **Verificação de segurança USB** (desativar)
   - ✅ **Permitir alterações de configuração** 

### **3. Configurações de Segurança MIUI:**
1. Vá em **Configurações** > **Privacidade** > **Segurança**
2. **Ativar:**
   - ✅ **Fontes desconhecidas**
   - ✅ **Instalar via USB**

### **4. Configurações Específicas MIUI:**
1. Vá em **Configurações** > **Configurações adicionais** > **Modo desenvolvedor**
2. **Ativar:**
   - ✅ **Instalar apps via USB**
   - ✅ **Ignorar verificações de segurança**

### **5. Desativar Mi Security (se disponível):**
1. Abra o app **Segurança**
2. Vá em **Configurações** > **Verificação de apps**
3. **Desativar** verificação automática

## 🔄 **Após Configurar:**

Execute o comando:
```bash
cd AppTotemClean
npx react-native run-android
```

## 🆘 **Se Ainda Não Funcionar:**

### **Método Alternativo 1 - Instalação Manual:**
```bash
# 1. Compilar APK
cd AppTotemClean/android
.\gradlew assembleDebug

# 2. Copiar APK para dispositivo
adb push app\build\outputs\apk\debug\app-debug.apk /sdcard/

# 3. Instalar manualmente no dispositivo
# Abra o gerenciador de arquivos no celular
# Navegue até /sdcard/ e toque no arquivo app-debug.apk
# Permita a instalação quando solicitado
```

### **Método Alternativo 2 - Reset de Permissões:**
```bash
# Resetar permissões ADB
adb kill-server
adb start-server
adb devices

# Aceitar novamente o prompt de depuração USB no dispositivo
```

## 💡 **Dicas Importantes:**

1. **Sempre aceite** os prompts de "Permitir depuração USB" no dispositivo
2. **Reinicie** o dispositivo após alterar configurações MIUI
3. **Mantenha** o cabo USB conectado durante todo o processo
4. Se tiver **conta Mi**, pode ser necessário fazer login para algumas configurações

## ✅ **Verificação Final:**

Após seguir os passos, execute:
```bash
adb devices
adb shell pm list packages | findstr apptotem
```

Se o app aparecer na lista, a instalação foi bem-sucedida! 