# Single-service image: builds the React app and serves it from the Express API.
# Used for simple hosting (e.g. Render). For the nginx + API stack use compose.prod.yml instead.
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
ENV FRONTEND_DIR=/app/public
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node backend/package.json ./
COPY --chown=node:node backend/src ./src
COPY --from=web --chown=node:node /web/dist ./public
USER node
EXPOSE 4000
CMD ["sh", "-c", "node src/migrate.js && exec node src/server.js"]
