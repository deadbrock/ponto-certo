@echo off
echo ===============================================
echo     TESTE DO APK COM CORRECOES DE ANIMACAO
echo ===============================================
echo.

echo [1/3] Verificando se dispositivo esta conectado...
adb devices
echo.

echo [2/3] Verificando APK gerado com correcoes...
dir android\app\build\outputs\apk\debug\app-debug.apk
echo.

echo [3/3] Instalando APK corrigido no dispositivo...
echo ⚠️  Se aparecer erro "INSTALL_FAILED_USER_RESTRICTED":
echo    - Acesse Configurações do dispositivo
echo    - Vá em "Sobre o telefone"
echo    - Toque 7x na "Versão MIUI" para ativar modo desenvolvedor
echo    - Volte e acesse "Opções do desenvolvedor"
echo    - Ative "Instalar via USB"
echo.

adb install -r android\app\build\outputs\apk\debug\app-debug.apk

if %errorlevel% equ 0 (
    echo.
    echo ✅ APK instalado com sucesso!
    echo.
    echo 🧪 TESTE DAS CORRECOES:
    echo ├─ ✅ StatusBar.tsx: useNativeDriver: false (setValue compatível)
    echo ├─ ✅ FloatingConfigButton.tsx: useNativeDriver: false (interpolate compatível)
    echo ├─ ✅ ActionCard.tsx: Já estava correto
    echo ├─ ✅ ProgressBar.tsx: Já estava correto
    echo └─ ✅ AlertBanner.tsx: Já estava correto
    echo.
    echo 🎯 Agora teste no aplicativo:
    echo 1. Abra o aplicativo no dispositivo
    echo 2. Navegue entre as telas
    echo 3. Teste as animações dos botões
    echo 4. Verifique se NÃO aparecem mais erros de "useNativeDriver"
    echo.
    echo 📱 O aplicativo deve estar funcionando sem erros de animação!
) else (
    echo.
    echo ❌ Falha na instalação. Possíveis soluções:
    echo.
    echo Para dispositivos Xiaomi/MIUI:
    echo 1. Configurações → Sobre o telefone → Toque 7x na versão MIUI
    echo 2. Voltar → Opções do desenvolvedor → Ativar "Instalar via USB"
    echo 3. Tentar novamente
    echo.
    echo Ou copiar APK manualmente:
    echo adb push android\app\build\outputs\apk\debug\app-debug.apk /sdcard/
    echo (Depois instale pelo gerenciador de arquivos)
)

echo.
pause 