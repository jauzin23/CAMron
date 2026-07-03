# =============================================================================
# Stage 1: builder
# Compiles native Node modules (better-sqlite3) using build-essential.
# Debian bookworm-slim is used to ensure glibc compatibility with the runner.
# =============================================================================
FROM node:20-bookworm-slim AS builder

# Install build tools needed only for compiling native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first — layer is cached unless deps change
COPY --chown=node:node package*.json ./

# Install ALL deps (including dev) so native modules compile correctly,
# then prune to production-only before copying to final stage
RUN npm ci
RUN npm prune --omit=dev

# Copy source
COPY --chown=node:node . .

# =============================================================================
# Stage 2: runner (final image)
# Lean Debian image. No compilers or heavy build tools.
# Contains python3, python3-serial, and bash (glibc compatible) for ESP32 compilation.
# arduino-cli binary only — core is installed at runtime into a named volume.
# =============================================================================
FROM node:20-bookworm-slim AS runner

# Install runtime dependencies needed for ESP32 compilers & tools (including bash, python, serial)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    python3 \
    python3-serial \
    python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# Install arduino-cli binary only (~10 MB) — no core, no toolchains
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/usr/local/bin sh

WORKDIR /app
RUN mkdir -p /app/data /home/node/.arduino15 && chown -R node:node /app /home/node/.arduino15

# Copy only the production node_modules (already pruned in builder stage)
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copy application source
COPY --chown=node:node . .

# Copy and set up the entrypoint script
COPY --chown=root:root entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER node

EXPOSE 3000

# Entrypoint handles one-time ESP32 core install into the mounted volume,
# then execs the CMD below
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
