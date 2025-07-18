@echo off
echo 🔧 Corrigindo problemas de conexão e animação...
echo.

echo 1. Parando Metro bundler...
taskkill /F /IM node.exe 2>nul || echo Metro não estava rodando

echo.
echo 2. Limpando cache do React Native...
npx react-native start --reset-cache --port 8081 &

echo.
echo 3. Aguardando Metro inicializar...
timeout /t 5 /nobreak >nul

echo.
echo 4. Limpando build Android...
cd android
if exist build rmdir /s /q build
cd app
if exist build rmdir /s /q build
cd ..\..

echo.
echo 5. Recompilando aplicativo...
npx react-native run-android

echo.
echo ✅ Correções aplicadas!
echo.
echo 📱 Mudanças realizadas:
echo - URL do servidor alterada para IP correto (192.168.56.1:3333)
echo - Animações corrigidas para evitar conflitos nativo/JS
echo - Cache limpo e app recompilado
echo.
echo 🔍 Verifique se o backend está rodando em: http://192.168.56.1:3333
echo.
pause 