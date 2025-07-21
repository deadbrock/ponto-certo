@echo off
echo.
echo ==========================================
echo   🚀 PREPARAR DEPLOY PARA RAILWAY
echo ==========================================
echo.

echo ✅ Verificando repositório Git...
git status

echo.
echo 📦 Adicionando arquivos modificados...
git add .

echo.
echo 💬 Fazendo commit das alterações...
set /p commit_msg="📝 Digite a mensagem do commit (ou pressione Enter para usar padrão): "
if "%commit_msg%"=="" set commit_msg=Preparar para deploy online - configurações de produção

git commit -m "%commit_msg%"

echo.
echo 🌐 Enviando para GitHub...
git push

echo.
echo ==========================================
echo   ✅ PRONTO PARA DEPLOY!
echo ==========================================
echo.
echo 📋 PRÓXIMOS PASSOS:
echo.
echo 1. Acesse: https://railway.app
echo 2. Faça login com GitHub
echo 3. Clique em "Start a New Project"
echo 4. Selecione "Deploy from GitHub repo"
echo 5. Escolha seu repositório: ponto_digital
echo 6. Configure conforme o GUIA-DEPLOY-ONLINE.md
echo.
echo 📄 Consulte o arquivo GUIA-DEPLOY-ONLINE.md para instruções detalhadas!
echo.
pause 