@echo off
echo 🔧 Correção de INSTALL_FAILED_USER_RESTRICTED
echo.

echo ✅ Etapa 1: Desinstalando versão anterior...
adb uninstall com.apptotemclean
echo Versão anterior removida!

echo.
echo 🧹 Etapa 2: Limpando cache e build...
cd android
if exist build rmdir /s /q build
cd app
if exist build rmdir /s /q build
cd ..\..

echo.
echo 🔧 Etapa 3: Instalação manual com flags de segurança...
echo Compilando APK...
cd AppTotemClean\android
gradlew assembleDebug

echo.
echo 📱 Etapa 4: Instalação com permissões especiais...
echo Tentando instalação com -r (replace) -g (grant permissions)...
adb install -r -g app\build\outputs\apk\debug\app-debug.apk

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Instalação falhou! Tentando método alternativo...
    echo.
    echo 📋 INSTRUÇÕES PARA RESOLVER NO DISPOSITIVO:
    echo.
    echo 1. 🔓 Ativar Modo Desenvolvedor:
    echo    - Vá em: Configurações ^> Sobre o dispositivo
    echo    - Toque 7 vezes em "Número da versão"
    echo.
    echo 2. 🔧 Habilitar Depuração USB:
    echo    - Vá em: Configurações ^> Opções do desenvolvedor
    echo    - Ativar "Depuração USB"
    echo    - Ativar "Instalar via USB"
    echo.
    echo 3. 🔒 Permitir Fontes Desconhecidas:
    echo    - Vá em: Configurações ^> Segurança
    echo    - Ativar "Fontes desconhecidas" ou "Instalar apps desconhecidos"
    echo.
    echo 4. 🔄 Após configurar, execute novamente:
    echo    npx react-native run-android
    echo.
    echo 💡 DICA: Se for emulador, pode ser necessário recriar um novo AVD
    echo.
) else (
    echo.
    echo ✅ Aplicativo instalado com sucesso!
    echo 🚀 Iniciando aplicativo...
    adb shell am start -n com.apptotemclean/.MainActivity
)

cd ..\..

echo.
echo 📱 Status final da instalação:
adb shell pm list packages | findstr apptotem

echo.
pause 