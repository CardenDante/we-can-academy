# Use Node.js LTS version
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat netcat-openbsd
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install netcat for health checks
RUN apk add --no-cache netcat-openbsd

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder for static assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy standalone server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static files to the correct location
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma Client (generated code)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Performance optimizations for heavy traffic
ENV NODE_OPTIONS="--max-old-space-size=2048"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
