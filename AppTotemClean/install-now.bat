@echo off
echo Instalando dependencias...
npm install --force
echo.
echo Verificando CLI...
npm list @react-native-community/cli --depth=0
echo.
echo Tentando build...
npm run android
pause 