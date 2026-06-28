// =============================================================
// CAMron - Camera Configuration
// Edit this file before flashing!
// =============================================================
#ifndef CONFIG_H
#define CONFIG_H

// --- WiFi ---
#define WIFI_SSID       "WIFI_QUARTO"
#define WIFI_PASSWORD   "33747491"
// --- Backend ---
// Your PC's LAN IP where Node.js is running.
// Find it with: ipconfig (Windows) → "IPv4 Address"
#define BACKEND_HOST    "192.168.0.62"   // ← CHANGE THIS
#define BACKEND_PORT    3000
#define BACKEND_PATH    "/api/cameras/register"

// --- Security ---
#define CAMERA_BEARER_TOKEN "b9df5c1b384a2d274e1639388de3a51dcaeab7f65e185019a8cc394b1c12b6d1"

// --- Camera Identity ---
// A short unique ID for this camera (no spaces)
#define CAMERA_ID       "6da6ea0c-92f8-4fa9-86c3-9a2b015de110"

// --- Stream ---
// Port the camera HTTP server will listen on
#define STREAM_PORT     81
#define CONTROL_PORT    80

#endif // CONFIG_H
