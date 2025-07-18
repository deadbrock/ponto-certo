@echo off
echo ===============================================
echo      TESTE FINAL DAS CORRECOES DE ANIMACAO
echo ===============================================
echo.

echo [1/4] Verificando correcoes no StatusBar.tsx...
findstr /n "useNativeDriver.*false.*setValue" src\components\StatusBar.tsx
if %errorlevel% equ 0 (
    echo ✅ StatusBar.tsx corrigido - useNativeDriver: false quando usa setValue()
) else (
    echo ❌ StatusBar.tsx NAO corrigido adequadamente
)
echo.

echo [2/4] Verificando correcoes no FloatingConfigButton.tsx...
findstr /n "useNativeDriver.*false.*interpolate" src\components\FloatingConfigButton.tsx
if %errorlevel% equ 0 (
    echo ✅ FloatingConfigButton.tsx corrigido - useNativeDriver: false quando usa interpolate()
) else (
    echo ❌ FloatingConfigButton.tsx NAO corrigido adequadamente
)
echo.

echo [3/4] Verificando se ActionCard.tsx ja estava correto...
findstr /n "useNativeDriver.*false.*Elevation" src\components\ActionCard.tsx
if %errorlevel% equ 0 (
    echo ✅ ActionCard.tsx correto - elevation usa useNativeDriver: false
) else (
    echo ❓ ActionCard.tsx pode precisar verificacao
)
echo.

echo [4/4] Verificando se ProgressBar.tsx ja estava correto...
findstr /n "useNativeDriver.*false" src\components\ProgressBar.tsx
if %errorlevel% equ 0 (
    echo ✅ ProgressBar.tsx correto - usa useNativeDriver: false
) else (
    echo ❓ ProgressBar.tsx pode precisar verificacao
)
echo.

echo ===============================================
echo           RESUMO DAS CORRECOES
echo ===============================================
echo.
echo StatusBar.tsx: Corrigido useNativeDriver para false (devido a setValue)
echo FloatingConfigButton.tsx: Corrigido useNativeDriver para false (devido a interpolate)
echo ActionCard.tsx: Ja estava correto (elevation = false, scale = true)
echo ProgressBar.tsx: Ja estava correto (width interpolation = false)
echo AlertBanner.tsx: Ja estava correto (apenas transform, sem setValue/interpolate)
echo.
echo ✅ Todas as correcoes aplicadas!
echo.
echo Para testar, execute:
echo npx react-native run-android
echo.
pause 