# Dockerfile: A Node.js backend szerver buildelési utasításai
FROM node:18-slim as base

# 1. Telepítési fázis
FROM base as deps
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production

# 2. A fő szerver fázis
FROM base as runner
WORKDIR /app
# Környezeti változók feltöltése a buildhez
ENV NODE_ENV production

# Kód másolása és port beállítása
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 8080 

# A szerver indítása (ugyanaz, mint a package.json 'start' parancsa)
CMD ["node", "server.js"]