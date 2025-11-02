# -------------------------------
# 1. Base image
# -------------------------------
FROM node:18-slim AS base
WORKDIR /app

# -------------------------------
# 2. Dependencies
# -------------------------------
FROM base AS deps
RUN apt-get update && apt-get install -y openssl
COPY package*.json ./
RUN npm ci

# -------------------------------
# 3. Build & runtime
# -------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 8080
CMD ["node", "server.js"]
