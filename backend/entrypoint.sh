#!/bin/sh
set -e

CORE_MARKER="$HOME/.arduino15/packages/esp32"

if [ ! -d "$CORE_MARKER" ]; then
  echo ">>> [entrypoint] ESP32 core not found in volume — installing (this happens once per machine)..."
  arduino-cli config init --overwrite
  arduino-cli config set board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
  arduino-cli core update-index
  arduino-cli core install esp32:esp32
  echo ">>> [entrypoint] ESP32 core installed successfully."
else
  echo ">>> [entrypoint] ESP32 core found in volume — skipping install."
fi

exec "$@"
