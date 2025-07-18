@echo off
echo Corrigindo vulnerabilidades de segurança...

echo Removendo node_modules para instalação limpa...
if exist node_modules rmdir /s /q node_modules

echo Limpando cache do npm...
npm cache clean --force

echo Instalando dependências atualizadas...
npm install

echo Verificando vulnerabilidades restantes...
npm audit

echo.
echo ✅ Correções aplicadas!
echo.
echo Se ainda houver vulnerabilidades, execute:
echo npm audit fix --force
echo.
pause 