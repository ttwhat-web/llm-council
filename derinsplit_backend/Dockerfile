# --- Builder ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json nest-cli.json ./
COPY prisma ./prisma

RUN npm install --no-audit --no-fund

COPY src ./src

RUN npx prisma generate
RUN npm run build

# --- Runtime ---
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
