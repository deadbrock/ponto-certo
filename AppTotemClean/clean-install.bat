@echo off
echo Limpando cache e reinstalando dependencias...

echo Removendo node_modules...
if exist node_modules rmdir /s /q node_modules

echo Limpando cache do npm...
npm cache clean --force

echo Limpando cache do React Native...
npx react-native clean

echo Removendo cache do Metro...
if exist metro-cache rmdir /s /q metro-cache

echo Instalando dependencias...
npm install

echo Instalando CLI do React Native...
npm install @react-native-community/cli@latest --save-dev

echo Limpando build do Android...
cd android
if exist .gradle rmdir /s /q .gradle
if exist build rmdir /s /q build
cd app
if exist build rmdir /s /q build
cd ../..

echo.
echo ✅ Limpeza concluida!
echo.
echo Agora execute: npm run android
echo.
pause 