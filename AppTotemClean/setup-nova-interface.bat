@echo off
chcp 65001 >nul
echo.
echo 🎨 ==========================================
echo    SETUP NOVA INTERFACE - PONTO CERTO FG
echo ==========================================
echo.

echo 📦 Instalando dependências modernas...
call npm install react-native-vector-icons react-native-linear-gradient react-native-svg

if %errorlevel% neq 0 (
    echo ❌ Erro na instalação das dependências!
    pause
    exit /b 1
)

echo.
echo ✅ Dependências instaladas com sucesso!
echo.

echo 🔧 Limpando cache do Metro...
call npm start -- --reset-cache >nul 2>&1

echo.
echo 🧹 Limpando build Android...
cd android
call gradlew clean >nul 2>&1
cd ..

echo.
echo 📋 PRÓXIMOS PASSOS MANUAIS:
echo.
echo 1. ANDROID - Editar android/app/build.gradle:
echo    Adicionar: apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
echo.
echo 2. ANDROID - Editar MainApplication.java:
echo    Importar: import com.oblador.vectoricons.VectorIconsPackage;
echo    Adicionar: new VectorIconsPackage() na lista de packages
echo.
echo 3. iOS - Editar ios/AppTotemClean/Info.plist:
echo    Adicionar as fontes MaterialIcons (veja NOVA-INTERFACE-SETUP.md)
echo.
echo 4. Executar: npm run android (ou ios)
echo.

echo 🎯 COMPONENTES CRIADOS:
echo    ✅ HeaderTotem - Header com gradiente azul
echo    ✅ ActionCard - Cartões modernos com ícones
echo    ✅ StatusBar - Barra de status dinâmica
echo    ✅ AlertBanner - Sistema de alertas
echo    ✅ HomeScreen - Tela principal modernizada
echo.

echo 📖 Para mais detalhes, consulte: NOVA-INTERFACE-SETUP.md
echo.

echo ✨ Setup concluído! Execute as configurações manuais acima.
pause 