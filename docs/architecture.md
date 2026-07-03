# Architecture

This page breaks down how CAMron's components talk to each other.

## Stack

- **Frontend:** Next.js / React
- **Backend:** Node.js + Express
- **Database:** SQLite
- **Camera:** ESP32-CAM

## Overview

- **Communication:** the frontend talks to the backend over a REST API for configuration and state, and uses Server-Sent Events (SSE) to stream compilation logs and camera connection status in real time.
- **Database:** a local SQLite database holds a `cameras` table (camera ID, randomly generated API key, IP, wifi credentials, online status), a `flash_history` table, and `settings`.
- **Video streaming:** the ESP32-CAM serves a local MJPEG stream. The browser doesn't connect to the camera directly, the backend proxies and multiplexes that stream (`GET /stream`), so multiple dashboard clients can view the same camera at once without overloading the ESP32.

```mermaid
flowchart LR
    A[Frontend Browser] <-->|REST / SSE / MJPEG| B(Node.js Backend & SQLite)
    B <-->|REST / MJPEG| C[ESP32-CAM]
```

## Setup & Flashing Flow

What happens when you set up a new camera, from entering wifi credentials to the board booting with firmware on it:

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Next.js Frontend
    participant Backend as Express Backend
    participant ArduinoCLI as Arduino CLI
    participant DB as SQLite DB
    participant ESP32 as ESP32-CAM

    User->>Frontend: Enter SSID, password, host, port
    Frontend->>Backend: 1. POST /api/compile/initiate
    Note over Backend: Generate cameraId & API key
    Backend->>DB: Save camera info & credentials
    Backend-->>Frontend: Return cameraId

    Frontend->>Backend: 2. GET /api/compile/stream/:cameraId (SSE)
    Note over Backend: Copy template folder, write config.h
    Backend->>ArduinoCLI: Spawn compile command
    ArduinoCLI-->>Backend: Compilation logs & bin files
    Backend-->>Frontend: Stream logs, then 'complete' event

    Frontend->>Backend: 3. GET /api/compile/download/:cameraId
    Backend-->>Frontend: Return binaries (firmware.bin, bootloader.bin, etc)

    User->>User: Plug ESP32-CAM into computer via USB
    Frontend->>ESP32: 4. Write binaries via Web Serial API (esptool-js)

    Note over ESP32: Reboot & connect to wifi
    ESP32->>Backend: 5. POST /api/confirm-flash (auth via api_key)
    Backend->>DB: Set last_seen, log flash history
```

## Runtime: Registration & Streaming

Once a camera is flashed, this repeats every time it boots or reconnects, not just once during setup:

```mermaid
sequenceDiagram
    participant ESP32 as ESP32-CAM
    participant Backend as Express Backend
    participant DB as SQLite DB
    actor User
    participant Frontend as Next.js Frontend

    ESP32->>Backend: Register (auth via api_key)
    Backend->>DB: Update last_seen, mark camera online

    User->>Frontend: Open dashboard
    Frontend->>Backend: Request camera list & status
    Backend-->>Frontend: Camera states from DB

    Backend->>ESP32: Proxy video stream
    Backend-->>Frontend: Forward stream to dashboard

    User->>Frontend: Toggle flashlight
    Frontend->>Backend: Send toggle command
    Backend->>ESP32: Forward command
```
