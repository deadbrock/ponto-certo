FROM ubuntu:22.04

# Instalar Node.js 18
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Criar diretório de uploads
RUN mkdir -p uploads/faces

# Expor porta
EXPOSE 3333

# Comando de início
CMD ["npm", "start"] 