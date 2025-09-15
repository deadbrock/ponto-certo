FROM ghcr.io/nodejs/node:18-alpine

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