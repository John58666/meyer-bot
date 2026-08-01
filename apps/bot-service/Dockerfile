FROM node:22-alpine
RUN addgroup -S bot && adduser -S bot -G bot
WORKDIR /app
COPY apps/bot-service/package.json apps/bot-service/tsconfig.json ./
RUN npm install --omit=dev
COPY apps/bot-service/src/ ./src/
COPY packages/bot-core/src/ ./packages/bot-core/src/
COPY packages/bot-core/package.json packages/bot-core/tsconfig.json ./packages/bot-core/
USER bot
ENV NODE_ENV=production
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3003/health || exit 1
CMD ["npx", "tsx", "src/index.ts"]
