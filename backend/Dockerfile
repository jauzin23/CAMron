FROM node:20-bookworm-slim

# Install system dependencies needed for ESP32 compilation & native node modules
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    python3 \
    python3-serial \
    python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# Install arduino-cli
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/usr/local/bin sh

# Set up application directory and database mount point
WORKDIR /app
RUN mkdir -p /app/data && chown -R node:node /app

# Run as non-root user 'node'
USER node

# Initialize arduino-cli configurations & pre-install the ESP32 core
RUN arduino-cli config init && \
    arduino-cli config set board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json && \
    arduino-cli core update-index && \
    arduino-cli core install esp32:esp32

# Install dependencies first for caching
COPY --chown=node:node package*.json ./
RUN npm ci

# Copy the rest of the application files
COPY --chown=node:node . .

EXPOSE 3000

CMD ["npm", "run", "start"]
