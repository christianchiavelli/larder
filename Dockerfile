# syntax=docker/dockerfile:1
# Nuxt's Nitro server. Build from the repository root: docker build -t larder .

ARG NODE_IMAGE=node:24.22.2-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85

FROM ${NODE_IMAGE} AS pnpm
ENV PNPM_HOME=/pnpm \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
# pnpm at the exact version `packageManager` names.
RUN corepack enable pnpm && corepack install

FROM pnpm AS build
# Downloading depends on the lockfile alone, so this layer outlives source edits.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --store-dir /pnpm/store
COPY . .
# postinstall is `nuxt prepare`, which needs the source, so the install comes after the copy.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile --store-dir /pnpm/store
RUN pnpm run build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
# Owned by root, only read by the server, which runs as `node`.
COPY --from=build /repo/.output ./
USER node
EXPOSE 3000
# Liveness only: it reads no upstream, so a catalogue outage is not this container's.
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --start-interval=2s --retries=3 \
    CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/api/health`).then(async (r) => process.exit(r.ok && (await r.json()).status === 'ok' ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server/index.mjs"]
