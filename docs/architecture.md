# Architecture Overview

This page breaks down how CAMron's components talk to each other.

## Stack

- **Frontend (Next.js)**
- **Backend (Node.js + Express)**
- **Database (SQLite)**
- **Camera (ESP32-CAM)**

---

## Flashing and Connection Flow

Here is exactly what happens when you set up a new camera:

```mermaid
sequenceDiagram
    participant User as Browser (Frontend)
    participant Backend as Express Backend
    participant ArduinoCLI as Arduino CLI
    participant ESP32 as ESP32-CAM
    participant DB as SQLite DB

    User->>Backend: 1. POST /api/compile/initiate (SSID, Pass, Host, Port)
    Note over Backend: Generate cameraId & API key
    Backend->>DB: Save camera info & credentials
    Backend-->>User: Return cameraId

    User->>Backend: 2. GET /api/compile/stream/:cameraId (SSE Stream)
    Note over Backend: Copy template folder & write config.h
    Backend->>ArduinoCLI: Spawn compile command
    ArduinoCLI-->>Backend: compilation logs & bin files
    Backend-->>User: Send logs & 'complete' event via SSE

    User->>Backend: 3. Download compiled binaries
    Backend-->>User: Return binaries (firmware.bin, bootloader.bin, etc)

    Note over User: Plug ESP32-CAM to computer USB
    User->>ESP32: 4. Write binaries via Web Serial API (esptool-js)

    Note over ESP32: Reboot & Connect to wifi
    ESP32->>Backend: 5. POST /api/confirm-flash (auth check via api_key)
    Backend->>DB: Set last_seen & log flash history

    ESP32->>Backend: 6. Register & Stream Video
    Backend->>User: Proxy stream & toggle commands
```
