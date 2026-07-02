FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --ignore-scripts

FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install tsx for background worker execution
RUN npm install -g tsx

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines

# Copy worker source for background processing
COPY worker.ts ./worker.ts
COPY tsconfig.json ./tsconfig.json

RUN chmod -R 777 /app/node_modules/@prisma/engines && \
    chmod -R 777 /app/node_modules/prisma && \
    chmod -R 777 /app/node_modules/.prisma

EXPOSE 3000
ENV PORT=3000

USER nextjs
ENTRYPOINT ["/docker-entrypoint.sh"]
