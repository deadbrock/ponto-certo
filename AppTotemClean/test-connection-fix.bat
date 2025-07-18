@echo off
echo 🔧 Testando correção de conexão e animação...
echo.

echo 1. Verificando backend no IP correto...
curl -s http://192.168.1.99:3333 > nul
if %errorlevel% == 0 (
    echo ✅ Backend está respondendo em http://192.168.1.99:3333
) else (
    echo ❌ Backend não está acessível em http://192.168.1.99:3333
    echo Verifique se o backend está rodando!
    pause
    exit /b 1
)

echo.
echo 2. Limpando cache React Native...
npx react-native start --reset-cache &

echo.
echo 3. Aguardando Metro inicializar...
timeout /t 3 /nobreak >nul

echo.
echo 4. Limpando build Android...
cd android
if exist build rmdir /s /q build
cd app
if exist build rmdir /s /q build
cd ..\..

echo.
echo 5. Executando aplicativo com correções...
npx react-native run-android

echo.
echo ✅ Teste concluído!
echo.
echo 📱 Verifique se:
echo - Não há mais erros de "useNativeDriver"
echo - Status mostra "Online" no aplicativo
echo - Conexão está funcionando em http://192.168.1.99:3333
echo.
pause 