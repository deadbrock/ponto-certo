# Instruções para Logo da Empresa

## Logo FG - Configuração

Para que a logo da empresa apareça no header do painel web, é necessário adicionar o arquivo de imagem da logo.

### Passos para adicionar a logo:

1. **Arquivo necessário**: `logo-fg.png`
2. **Localização**: `painel-web/public/logo-fg.png`
3. **Especificações da imagem**:
   - Altura máxima: 40px
   - Formato: PNG (recomendado)
   - Proporções: Manter as proporções originais da logo
   - Fundo: Transparente (recomendado)

### Como adicionar:

1. Copie o arquivo `logo-fg.png` para o diretório `painel-web/public/`
2. Reinicie o servidor de desenvolvimento se estiver rodando
3. A logo aparecerá automaticamente no canto esquerdo do header

### Observações:

- A logo será posicionada antes do texto "Ponto Certo FG"
- Estará envolvida em um contêiner com fundo branco e bordas arredondadas
- **Contêiner**: fundo branco (#ffffff), padding 6px, border-radius 8px
- Terá um espaçamento de 16px à direita do contêiner
- Será redimensionada automaticamente para altura máxima de 40px
- As proporções serão mantidas automaticamente
- O contêiner branco oferece melhor contraste com o header azul

### Cores atualizadas:

- Header: Azul #354a80
- Botões de ação: Vermelho #a2122a
- Todos os elementos foram ajustados para harmonia visual 