# CAMron — Project Specification

> The definitive reference for what CAMron is, how it works, and what it will become.

---

## 1. What is CAMron?

**CAMron** is an open-source, self-hosted surveillance platform built around the ESP32-CAM microcontroller. It lets you turn a **€5 ESP32-CAM module** into a fully working home camera system — without ever opening a terminal.

### The Pitch (30 seconds)

> Plug an ESP32-CAM into your USB port. Open your browser. Enter a name and WiFi password. Click Flash. Unplug. The camera appears on your live dashboard. That's it. No Arduino IDE. No terminal. No cloud subscriptions. Just Docker and a browser.

### Core Values

| Value | Meaning |
|---|---|
| **Zero terminal** | Everything through the browser — flash, configure, monitor |
| **Zero cloud** | Fully self-hosted, no data leaves your network |
| **Zero cost** | Open-source software + €5 hardware per camera |
| **Zero friction** | Re-flash in seconds, all configs remembered |

---

## 2. User Stories

### First-Time Setup
> *As a user, I want to run `docker compose up` and have a working surveillance dashboard accessible in my browser, so I can start adding cameras immediately.*

### Flash New Camera
> *As a user, I want to plug an ESP32-CAM into my USB port, fill in a camera name and WiFi credentials, click Flash, and see the camera appear on my dashboard — all without leaving my browser.*

### View Live Feeds
> *As a user, I want to see all my cameras in a customizable grid layout, where I can drag-and-drop to rearrange, click to fullscreen, and take snapshots — all in real-time.*

### Re-flash Camera
> *As a user, I want to plug in an existing camera, have it automatically identified, see its saved settings pre-filled, change the WiFi password, and re-flash — with zero manual data entry.*

### Monitor Camera Status
> *As a user, I want to know at a glance which cameras are online and which are offline, without checking each one individually.*

### Take Snapshots
> *As a user, I want to click one button and immediately download a JPEG snapshot from any camera.*

---

## 3. Technology Stack

| Layer | Technology | Justification |
|---|---|---|
| **Frontend** | Next.js (React, JavaScript) | Server-side rendering, file-based routing, React ecosystem |
| **UI Components** | shadcn/ui (exclusive) | Modern, accessible, customizable, consistent design system |
| **Styling** | Tailwind CSS | shadcn/ui dependency, utility-first CSS |
| **Backend** | Express.js (Node.js, JavaScript) | Mature, simple, massive ecosystem, streaming-capable |
| **Database** | SQLite via `better-sqlite3` | Zero config, embedded, synchronous API, perfect for self-hosted |
| **Compiler** | PlatformIO CLI | Faster than Arduino CLI, better dependency management |
| **Firmware** | C++ (Arduino framework, ESP32) | Standard for ESP32 development, mature libraries |
| **Flash** | esptool-js + Web Serial API | In-browser firmware flashing, no local tools needed |
| **Streaming** | MJPEG (HTTP multipart) | Native browser support via `<img>` tag, zero JS overhead |
| **Events** | Server-Sent Events (SSE) | Simple, HTTP-native, perfect for one-way server → client updates |
| **Containers** | Docker + Docker Compose | Standard self-hosted deployment, reproducible environment |

---

## 4. Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                        │
│                                                          │
│  ┌────────────────────┐    ┌─────────────────────────┐  │
│  │   Next.js Frontend  │    │  Web Serial API         │  │
│  │   (shadcn/ui)       │    │  + esptool-js           │  │
│  └────────┬───────────┘    └──────────┬──────────────┘  │
│           │ REST + SSE                │ USB Serial       │
└───────────┼───────────────────────────┼─────────────────┘
            │                           │
            ▼                           ▼
┌───────────────────────┐    ┌──────────────────┐
│   Express.js Backend   │    │  ESP32-CAM (USB)  │
│   ├── REST API         │    │                    │
│   ├── MJPEG Relay      │    └──────────────────┘
│   ├── SSE Events       │
│   ├── PlatformIO       │    ┌──────────────────┐
│   └── SQLite DB        │◄───┤  ESP32-CAM (WiFi) │
│                         │    │  HTTP POST frames  │
└─────────────────────────┘    └──────────────────┘
```

> See [architecture.md](./architecture.md) for detailed diagrams, API spec, and database schema.

---

## 5. Core Flows

### 5.1 Add New Camera

```
User opens /flash → Wizard starts
  ├── Step 1: AUTO serial handshake (GET_CAM_ID)
  │   └── No response = new camera → empty form
  ├── Step 2: User fills: Name*, WiFi SSID*, WiFi Pass*
  │   └── Advanced (collapsed): resolution, FPS, quality, rotation, mirror, flip
  ├── Step 3: Submit → Backend creates camera + compiles firmware
  │   └── SSE shows: "Compiling..." → progress bar → "Done!"
  ├── Step 4: Frontend downloads .bin → esptool-js flashes via USB
  │   └── Progress bar: 0% → 100% → "Flash complete!"
  └── Step 5: Success screen → "Unplug camera and power it up"
      └── Camera appears on dashboard when it connects to WiFi
```

### 5.2 Re-flash Existing Camera

```
User opens /flash → Wizard starts
  ├── Step 1: AUTO serial handshake (GET_CAM_ID)
  │   └── Response "CAM_ID:abc-123" → fetch saved configs
  ├── Step 2: Form PRE-FILLED with saved data (name, WiFi, settings)
  │   └── User changes WiFi password
  └── Steps 3-5: Same as new camera (compile → flash → done)
      └── All settings saved for next re-flash
```

### 5.3 Live Streaming

```
ESP32 boots → connects WiFi → starts frame loop
  └── Every ~66ms (15 FPS):
      POST /api/ingest/{camId}
      Header: X-API-Key: {key}
      Body: JPEG binary

Backend receives → validates API key → updates last_seen
  └── Relays frame to all connected browser clients

Browser Dashboard:
  └── <img src="/stream/{camId}"> renders live MJPEG feed
```

### 5.4 Camera Goes Offline

```
ESP32 loses WiFi / power / crashes
  └── Backend stops receiving frames
      └── After 30 seconds (configurable):
          ├── SSE event: camera:offline {camId}
          └── Dashboard shows red "Offline" badge
```

### 5.5 Snapshot

```
User clicks 📷 on camera tile
  └── Frontend: GET /api/cameras/{camId}/snapshot
      └── Backend grabs latest buffered frame
          └── Returns as image/jpeg with Content-Disposition: attachment
              └── Browser downloads "camera-name-2024-01-15-14-30-22.jpg"
```

---

## 6. UI Pages & Components

### 6.1 Dashboard (`/`)

The main screen. Shows all cameras in a drag-and-drop grid.

| Element | Component | Behavior |
|---|---|---|
| Camera tile | `Card` + `<img>` MJPEG | Live feed, name overlay, status badge |
| Status badge | `Badge` | Green "Online" / Red "Offline" |
| Actions menu | `DropdownMenu` | Edit, Snapshot, Delete |
| Fullscreen | `Dialog` | Click tile → fullscreen with controls |
| Grid | Custom with dnd-kit | Drag to rearrange, order persisted |
| Empty state | Custom | "No cameras yet. Flash your first one!" with CTA |

### 6.2 Flash Wizard (`/flash`)

Multi-step wizard for configuring and flashing cameras.

| Step | Components | Notes |
|---|---|---|
| 1. Config | `Form`, `Input`, `Collapsible` | Name always visible, advanced collapsed |
| 2. Compile | `Progress`, custom status | SSE-driven, animated |
| 3. Flash | `Progress`, serial controls | esptool-js, port selector |
| 4. Done | Custom success/error | Animation, next steps |

### 6.3 Camera List (`/cameras`)

Management view for all registered cameras.

| Element | Component | Notes |
|---|---|---|
| Camera card | `Card` | Name, status, last seen, thumbnail |
| Edit button | `Button` → page/dialog | Opens edit form |
| Delete button | `AlertDialog` | Confirmation before deletion |
| Re-flash button | `Button` | Links to /flash with pre-filled data |

### 6.4 Camera Detail (`/cameras/[id]`)

Individual camera view with all settings.

| Element | Component | Notes |
|---|---|---|
| Live preview | `<img>` MJPEG | Current feed |
| Settings form | `Form` | All configurable fields |
| Advanced toggle | `Collapsible` | Resolution, FPS, quality, etc. |
| Flash history | `Table` | Past flash attempts |
| Danger zone | `Card` (destructive) | Delete camera |

### 6.5 Settings (`/settings`)

Global application configuration.

| Setting | Component | Notes |
|---|---|---|
| Server URL | `Input` (read-only) | From env var, informational |
| Offline timeout | `Input` (number) | Seconds before marking offline |
| Theme | Toggle | Dark/Light |

### 6.6 Sidebar (All pages)

| State | Behavior |
|---|---|
| Expanded | Icon + text labels, full navigation |
| Collapsed | Icon only, tooltips on hover |
| Mobile | Drawer overlay, toggle button |

Navigation items:
- 🏠 Dashboard
- ⚡ Flash
- 📷 Cameras
- ⚙️ Settings

---

## 7. Database Schema

> Full schema with SQL in [architecture.md](./architecture.md#5-database-schema).

### Tables

| Table | Purpose | Key Fields |
|---|---|---|
| `cameras` | Camera registry + config | id (UUID), api_key, name, wifi_ssid, wifi_pass, resolution, fps, ... |
| `flash_history` | Audit trail of flash attempts | camera_id (FK), flashed_at, success |
| `settings` | Global key-value settings | key, value |

---

## 8. API Reference

> Full API spec in [architecture.md](./architecture.md#4-api-specification).

### Quick Reference

| Verb | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/cameras` | Create + compile |
| `GET` | `/api/cameras` | List all |
| `GET` | `/api/cameras/:id` | Get one |
| `PUT` | `/api/cameras/:id` | Update + recompile |
| `DELETE` | `/api/cameras/:id` | Delete |
| `GET` | `/api/cameras/:id/firmware` | Download .bin |
| `GET` | `/api/cameras/:id/snapshot` | Snapshot download |
| `POST` | `/api/cameras/:id/flash-result` | Report flash result |
| `GET` | `/stream/:id` | MJPEG relay |
| `POST` | `/api/ingest/:id` | ESP32 frame push |
| `GET` | `/api/settings` | Get settings |
| `PUT` | `/api/settings` | Update settings |
| `GET` | `/api/events` | SSE event stream |

---

## 9. Security Model

| Aspect | Approach |
|---|---|
| **Authentication** | None (single-user, self-hosted) |
| **ESP32 auth** | Per-camera API key in `X-API-Key` header |
| **Device exposure** | Push model — ESP32 IP never exposed to network |
| **WiFi creds** | Stored in SQLite on user's server (plaintext, needed for re-flash) |
| **Stream access** | MJPEG relay only accessible via backend's network |
| **External access** | User responsible for reverse proxy + HTTPS if exposing externally |

---

## 10. Deployment

### Requirements

- Docker + Docker Compose
- 1GB+ RAM (PlatformIO compilation)
- 2GB+ disk (PlatformIO cache + SQLite)
- Network accessible from ESP32-CAM devices (same LAN or port forwarding)

### Quick Start

```bash
git clone https://github.com/jauzin23/CAMron.git
cd CAMron
cp docker/.env.example docker/.env
# Edit docker/.env → set CAMRON_SERVER_URL to your server's IP
docker compose up -d
# Open http://localhost:3000 → start flashing cameras!
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `CAMRON_SERVER_URL` | `http://localhost:3001` | Backend URL for ESP32 to send frames to |
| `PORT` | `3001` | Backend server port |
| `NEXT_PUBLIC_API_URL` | `http://backend:3001` | Backend URL for frontend API calls |

---

## 11. Roadmap (Summary)

| Phase | Focus | Timeline |
|---|---|---|
| **Phase 1: MVP** | Flash, stream, manage, dashboard | 6-8 weeks |
| **Phase 2: Enhanced** | Floor plan map, groups, diagnostics | 4-6 weeks |
| **Phase 3: Recording** | Continuous/motion recording, playback | 6-8 weeks |
| **Phase 4: Advanced** | Webhooks, OTA, multi-user, HA integration | 8-12 weeks |

> See [roadmap.md](./roadmap.md) for detailed milestones, dependencies, and estimates.

---

## 12. Design Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Frontend framework | Next.js | SSR, file-based routing, React ecosystem |
| UI components | shadcn/ui (exclusive) | Modern, accessible, consistent — no mixing |
| Backend framework | Express.js | Mature, simple, streaming-capable |
| Database | SQLite (better-sqlite3) | Zero config, embedded, no extra container |
| Compiler | PlatformIO | Faster than Arduino CLI, better deps |
| Streaming protocol | MJPEG | Native browser support, zero JS overhead |
| Streaming direction | Push (ESP32 → backend) | Security: no exposed device IPs |
| Auth | None (single-user) | Self-hosted, simplicity over complexity |
| Language | JavaScript (no TypeScript) | Faster iteration, less boilerplate |
| Repo structure | Monorepo with workspaces | Single repo, shared tooling, independent packages |
| Theme | Custom (logo colors) | Brand identity, dark-first for surveillance use |
| Target hardware | AI-Thinker ESP32-CAM | Most popular, cheapest, widely available |
| Docker setup | 2 containers | Minimum complexity while keeping frontend/backend separate |
| Camera identification | Serial handshake | Automatic detection, zero friction re-flash |
| Events | SSE (not WebSocket) | Simpler, HTTP-native, sufficient for one-way events |

---

## Related Documents

- [architecture.md](./architecture.md) — Detailed system architecture, diagrams, API spec, schema
- [competitive-analysis.md](./competitive-analysis.md) — Competitor comparison and positioning
- [roadmap.md](./roadmap.md) — Phased development plan with milestones and estimates
