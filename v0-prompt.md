# Prompt for v0: High-End Home Camera Surveillance & Management Platform (CAMron)

You are a senior frontend engineer and UI/UX designer. Your task is to build a premium, state-of-the-art surveillance and node-management dashboard for **CAMron**, an open-source home camera platform built around the **ESP32-CAM**.

---

## 🎨 Design Theme & Core Aesthetic Guidelines
This is a premium, developer-oriented, high-fidelity security application. **DO NOT** make it look like a generic dashboard. It must look sleek, high-tech, and futuristic yet functional (think Vercel, Linear, or custom hardware interfaces).

*   **Color Palette**: Strictly dark-mode first.
    *   **Backgrounds**: Rich black (`#09090b`) and deep zinc-900/950 (`#18181b`, `#09090b`).
    *   **Accents**: 
        *   **Emerald** (`#10b981` / `#34d399`) for "Live" status, active connections, and success states.
        *   **Rose/Red** (`#ef4444` / `#f43f5e`) for "Recording", errors, and destructive actions.
        *   **Zinc/Neutral** for elegant, subtle borders (`border-zinc-800`), dividers, and inactive states.
*   **Typography**: Clean, high-legibility sans-serif for main interfaces, combined with a precise monospace font (e.g., `Geist Mono` or `JetBrains Mono`) for telemetry data, device IDs, terminal logs, and system metrics.
*   **Visual Polish**:
    *   Subtle grid backgrounds (`bg-[linear-gradient(...)]` or dots) to give a hardware lab environment feel.
    *   Card designs with soft, glowing hover effects or subtle border highlights.
    *   Segmented control buttons and toggle pills with micro-interactions.
    *   No generic, raw HTML elements. Use professional iconography and clean layout spacing.

---

## 🛠️ Tech Stack & Required Libraries (CRITICAL)
You must use exclusively premium, modern UI libraries. **DO NOT build components from scratch if a library equivalent exists.**
1.  **Tailwind CSS**: For all styling, colors, layout grids, flexboxes, and transitions.
2.  **Lucide React**: For beautiful, consistent outline icons.
3.  **shadcn/ui & Radix UI Patterns**: Implement equivalent high-fidelity components matching the style of:
    *   `Sheet` (Slide-out panels with backdrop blur)
    *   `Resizable` (Drag-to-resize panel groups for surveillance grids)
    *   `DropdownMenu` (Clean, contextual actions with shortcuts and indicators)
    *   `Card` (Modern containers with defined border lines and headers)
    *   `Progress` (Clean, thin linear progress loaders)
    *   `Badge` (Small status tags, mono fonts, dot indicators)
    *   `Calendar` (Date picker popover)
    *   `Tabs` (Animated sliding tabs)
    *   `Input`, `Select`, `Label`, `Separator` (Fully-styled form controls)

---

## 📂 Core Navigation & Tabs
The dashboard must feature a top navigation bar (featuring the CAMron logo, global surveillance timestamp, and tab selectors) and contain **4 primary views**:

### 1. Device Management (`/`)
This is the cluster homepage where users monitor and configure hardware nodes.
*   **Top Actions**: A prominent, beautifully styled button to **"Pair Device"** that triggers a side sheet/drawer.
*   **Node Grid**: A grid of paired camera cards. Each card must contain:
    *   **Header**: Camera name (e.g., "Main Entrance", "Server Room"), a colored status badge ("Live" (Emerald), "Recording" (Red), "Offline" (Gray)), and current target FPS.
    *   **SVG Hardware Representation**: A detailed, styled SVG graphic of a physical ESP32-CAM circuit board (complete with micro-SD slot, chip cover, camera lens module, and a glowing status LED matching the camera state).
    *   **Telemetry Section**: Monospace text displaying IP address, signal strength (with segmented RSSI bar indicator), and dBm signal value.
    *   **Footer Actions**: A button to access the recording archive for that node, and a dropdown menu (`MoreVertical`) for settings: *Configure*, *Restart*, *Suspend*, and *Remove* (destructive style).
*   **"Pair Device" Sheet Flow**: A 2-step setup wizard:
    *   **Step 1: Metadata**: Form inputs for *Device name*, *Wi-Fi SSID*, *Wi-Fi Password*, and an **Advanced Parameters Accordion** containing resolution dropdowns (from QQVGA to UXGA), target FPS selectors, JPEG quality presets, image rotation (0°, 90°, 180°, 270°), and horizontal/vertical mirror toggles.
    *   **Step 2: Flash**: A simulated Web Serial flashing terminal interface. Shows a graphical representation of the USB to serial bridge connection (`USB ===[ttyUSB0]===> ESP32`), a button to "Detect & Flash Firmware", a running progress bar, and a monospace, typewriter-animated terminal output simulating firmware compilation and block flashing logs.

### 2. Live Wall (`/view`)
A multi-stream grid for real-time video surveillance.
*   **Layout Customization Bar**: Options to choose layout presets (e.g., "3x2 grid", "2x3 grid", "Solo focus"). Includes a dropdown menu to select which camera channels are visible and a toggle to only display online cameras.
*   **Surveillance Grid**: Uses a draggable, resizable layout (like `ResizablePanelGroup` / `ResizablePanel`) to display multiple video feeds side-by-side.
*   **Camera Stream Viewport**:
    *   Shows a simulated video feed with a scanline overlay or subtle static effect if offline.
    *   An overlay containing: Camera Name, live timestamp, green indicator light, latency metric (e.g., `85ms`), resolution tag, and action overlays to take a snapshot, enter fullscreen, or mute.

### 3. Video Archive (`/archive`)
A search and replay system for stored video footage.
*   **Filter Bar**: Features a Search Input field, a Date Picker selector (simulating calendar dropdown), and a quick indicator showing storage usage (e.g., "STORAGE USED: 8.6 GB / 64 GB").
*   **Recording Clips Grid**: A grid of recordings, displaying:
    *   **Metadata**: ID tag, Camera name, recorded timestamp, and trigger event badge (e.g., "Motion Detected", "Scheduled", "Door Opened").
    *   **Telemetry**: Monospace telemetry tags showing clip duration and file size.
    *   **Hover Play Overlay**: Hovering over a card dims it and displays a "Play Clip" button and a "Download" icon. Clicking "Play" opens a beautiful video player modal.

### 4. Settings (`/settings`)
A unified screen to configure cluster-wide parameters.
*   **Cluster Settings**: Configures overall cluster identity, NTP servers, and toggles for local streaming tunnels.
*   **Network Profiles**: Setup static DHCP ranges and global backup Wi-Fi SSIDs.
*   **Storage Allocation**: A styled progress bar showcasing disk quota and options to configure storage auto-purging policies (e.g. "Auto-purge older than 30 days").
*   **System Actions (Danger Zone)**: High-contrast destructive options to "Reset Cluster" and "Purge Storage".

---

## ⚡ Interaction & Motion Goals
*   **State Management**: Fully interactive inputs, checkboxes, dropdowns, and tabs using React state.
*   **Animations**: Smooth micro-animations for status rings, rotating loading icons (`animate-spin`), pulses for live badges, and sliding transitions between tabs.
*   **UX Cues**: Hovering buttons should slide-glow, select dropdowns should open with a smooth scale-in, and sheet entries should ease in from the side.
