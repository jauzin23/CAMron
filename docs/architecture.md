# CAMron Architecture

This document describes how the different parts of CAMron work together to let you configure, compile, and flash firmware onto your camera.

## Core Components

The project consists of four main parts:

The frontend is a **Next.js** web application. It's the user interface where you can monitor active camera streams and flash firmware.

The backend is a **Node.js** and **Express** application. It handles the **API** requests, uses the db, manages the compilation of the firmware, and proxies the video streams from the cameras.

The database is a local SQLite database.

The camera is an **ESP32-CAM** module running custom **C++** firmware. It connects to your Wi-Fi network and streams video back to the backend.

## Flashing and Handshake Workflow

Here is how the system behaves when you set up a new camera.

```mermaid
sequenceDiagram
    participant User as Browser / Frontend
    participant Backend as Express Backend
    participant ArduinoCLI as Arduino CLI
    participant ESP32 as ESP32-CAM
    participant DB as SQLite Database

    User->>Backend: 1. POST /api/compile/initiate (SSID, Password, Host, Port)
    Note over Backend: Generate cameraId & API key
    Backend->>DB: Save/update camera details (wifi credentials, api_key)
    Backend-->>User: Return cameraId

    User->>Backend: 2. GET /api/compile/stream/:cameraId (SSE Stream)
    Note over Backend: Copy template folder & write config.h
    Backend->>ArduinoCLI: Spawn compile command
    ArduinoCLI-->>Backend: Compilation logs & binaries (.bin files)
    Backend-->>User: Send logs & 'complete' event via SSE

    User->>Backend: 3. Download bin files (firmware, bootloader, partitions, boot_app0)
    Backend-->>User: Return binaries

    Note over User: User connects ESP32-CAM via USB
    User->>ESP32: 4. Flash binaries via Web Serial API (esptool-js)

    Note over ESP32: Reboot & Connect to Wi-Fi
    ESP32->>Backend: 5. POST /api/confirm-flash (Handshake check & Auth Token)
    Backend->>DB: Update last_seen & flash history

    ESP32->>Backend: 6. Register & Stream Video (regular intervals)
    Backend->>User: Proxy video stream & camera controls
```
