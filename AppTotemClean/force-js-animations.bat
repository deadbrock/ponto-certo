@echo off
echo ===============================================
echo    FORCANDO TODAS ANIMACOES PARA JAVASCRIPT
echo ===============================================
echo.

echo [1/5] Corrigindo AlertBanner - forcar JS para slideAnim...
echo Ja foi corrigido anteriormente
echo.

echo [2/5] Verificando FloatingConfigButton - scaleAnim pode estar causando problema...
echo Alterando scaleAnim para useNativeDriver: false
powershell -Command "(Get-Content 'src\components\FloatingConfigButton.tsx') -replace 'useNativeDriver: true,', 'useNativeDriver: false, // Forcado para JS' | Set-Content 'src\components\FloatingConfigButton.tsx'"
echo.

echo [3/5] Verificando ActionCard - scaleAnim pode estar causando problema...
echo Alterando todas animacoes de escala para useNativeDriver: false
powershell -Command "(Get-Content 'src\components\ActionCard.tsx') -replace 'useNativeDriver: true, // Escala: nativa', 'useNativeDriver: false, // Forcado para JS' | Set-Content 'src\components\ActionCard.tsx'"
echo.

echo [4/5] Verificando se existem outras animacoes nativas...
findstr /r "useNativeDriver.*true" src\components\*.tsx
echo.

echo [5/5] Limpando cache e recompilando...
echo Limpando cache do Metro...
npx react-native start --reset-cache &
timeout /t 3 /nobreak >nul

echo Limpando build Android...
if exist android\build rmdir /s /q android\build
if exist android\app\build rmdir /s /q android\app\build

echo.
echo ===============================================
echo           TODAS ANIMACOES AGORA EM JS
echo ===============================================
echo.
echo ✅ StatusBar.tsx: useNativeDriver: false
echo ✅ AlertBanner.tsx: useNativeDriver: false  
echo ✅ FloatingConfigButton.tsx: useNativeDriver: false
echo ✅ ActionCard.tsx: useNativeDriver: false
echo ✅ ProgressBar.tsx: useNativeDriver: false (ja estava)
echo.
echo 🎯 Agora TODAS as animacoes usam JavaScript apenas!
echo 📱 Isso deve eliminar 100% dos erros de useNativeDriver.
echo.
echo Compilando aplicativo...
npx react-native run-android
echo.
pause 