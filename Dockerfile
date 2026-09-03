# syntax=docker/dockerfile:1

# ===== Stage 1: Install ALL dependencies (including dev) =====
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# ===== Stage 2: Build Next.js + Seed database =====
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js (creates standalone output)
RUN npm run build

# Seed the database with demo data
RUN mkdir -p /app/data
RUN node --import ./node_modules/tsx/dist/loader scripts/seed.ts

# ===== Stage 3: Production runner =====
FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update -qq && apt-get install -y --no-cache bash && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone Next.js output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy seeded database as a template (will be copied to volume on first boot)
COPY --from=builder /app/data/ppr.db /app/data-template/ppr.db

# Copy entrypoint
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

# Volume for persistent SQLite database
VOLUME ["/app/data"]

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
