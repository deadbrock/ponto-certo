@echo off
echo Corrigindo versão do React Native Reanimated...

echo Removendo versão incompatível...
npm uninstall react-native-reanimated

echo Instalando versão compatível...
npm install react-native-reanimated@3.4.2 --save

echo Limpando build do Android...
cd android
if exist build rmdir /s /q build
cd app
if exist build rmdir /s /q build
cd ../..

echo.
echo ✅ Reanimated corrigido! Tentando build...
npm run android 