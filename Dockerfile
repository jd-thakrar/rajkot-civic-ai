FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV STATIC_DIR=/app

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js ./server.js

EXPOSE 8080
ENV PORT=8080
CMD ["node", "src/server/index.js"]
