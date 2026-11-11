# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# MON MARCHÉ — image de production (Next.js « standalone »)
#   docker build -t mon-marche .
# Cibles : `runner` (application) et `tools` (migrations, import du catalogue).
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && apk add --no-cache libc6-compat

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Outils : migrations, import de l'instantané, création d'un administrateur.
FROM build AS tools
ENV NODE_ENV=production
CMD ["pnpm", "db:setup"]

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
# Instantané du catalogue (réimport possible depuis l'administration).
COPY --from=build --chown=app:app /app/data ./data
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
