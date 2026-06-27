// =============================================================
// CAMron — Camera Configuration
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
#define BACKEND_PATH    "/api/camera/register"

// --- Security ---
// Must EXACTLY match CAMERA_BEARER_TOKEN in backend/.env
// Use a long random string — e.g. generate with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#define CAMERA_BEARER_TOKEN "fd70b9def358ed9d30406a5a63b0e6d725863f09f801291e0952399e1b8ddb85"

// --- Camera Identity ---
// A short unique ID for this camera (no spaces)
#define CAMERA_ID       "cam1"

// --- Stream ---
// Port the camera HTTP server will listen on
#define STREAM_PORT     81

#endif // CONFIG_H
