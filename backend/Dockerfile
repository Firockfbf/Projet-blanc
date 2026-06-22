FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY scripts ./scripts

EXPOSE 3001

CMD ["node", "src/server.js"]
