FROM node:20-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --chown=node:node package*.json ./

RUN npm ci
RUN npm prune --omit=dev

COPY --chown=node:node . .

FROM node:20-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    python3 \
    python3-serial \
    python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/usr/local/bin sh

WORKDIR /app
RUN mkdir -p /app/data /home/node/.arduino15 && chown -R node:node /app /home/node/.arduino15

COPY --from=builder --chown=node:node /app/node_modules ./node_modules

COPY --chown=node:node . .

COPY --chown=root:root entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER node

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
