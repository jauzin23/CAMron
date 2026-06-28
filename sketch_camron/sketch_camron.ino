// =============================================================
// CAMron - Main Arduino sketch for ESP32-CAM (AI-Thinker / OV2640)
//
// What this does:
//   1. Connects to WiFi
//   2. Initialises the OV2640 camera
//   3. POSTs this camera's IP to the backend (handshake)
//   4. Starts the bearer-protected MJPEG stream server on STREAM_PORT
// =============================================================

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include "config.h"

// ── AI-Thinker pin map ────────────────────────────────────────
// These are fixed for the classic black ESP32-CAM module.
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Declared in app_httpd.cpp
void startCameraServer();

// ── Startup handshake ─────────────────────────────────────────
// Tell the backend our IP so it can proxy to us.
static void registerWithBackend() {
  HTTPClient http;

  String url = String("http://") + BACKEND_HOST + ":" + BACKEND_PORT + BACKEND_PATH;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " CAMERA_BEARER_TOKEN);

  String body = "{\"id\":\"" CAMERA_ID "\",\"ip\":\"" + WiFi.localIP().toString() + "\"}";

  Serial.println("Registering with backend: " + url);
  Serial.println("Body: " + body);

  int code = http.POST(body);
  if (code > 0) {
    Serial.printf("Backend responded: %d\n", code);
    Serial.println(http.getString());
  } else {
    Serial.printf("Backend POST failed: %s\n", http.errorToString(code).c_str());
    Serial.println("Will retry in loop - stream server will still start.");
  }
  http.end();
}

// ── setup() ──────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println("\n\n=== CAMron booting ===");

  // ── Camera init ──────────────────────────────────────────────
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location  = CAMERA_FB_IN_DRAM;
  config.jpeg_quality = 10;
  config.fb_count     = 1;

  if (psramFound()) {
    // Init with UXGA so PSRAM frame buffers are sized for the largest resolution.
    // GRAB_LATEST + fb_count=2 is what the original working sketch used with PSRAM.
    config.jpeg_quality = 10;
    config.fb_count     = 2;
    config.grab_mode    = CAMERA_GRAB_LATEST;
    config.fb_location  = CAMERA_FB_IN_PSRAM;
    config.frame_size   = FRAMESIZE_UXGA;
    Serial.println("PSRAM found - init UXGA");
  } else {
    config.frame_size  = FRAMESIZE_QVGA;
    config.fb_location = CAMERA_FB_IN_DRAM;
    Serial.println("No PSRAM - using QVGA");
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init FAILED: 0x%x\n", err);
    while (true) { delay(1000); }
  }
  Serial.println("Camera init OK");

  // CRITICAL: immediately drop to QVGA so cam_task stabilizes on its first
  // DMA run. Without this, the task overflows its stack trying to process a
  // full UXGA frame before its ring buffer has settled. This is what the
  // original working sketch did. We will upgrade the resolution after WiFi
  // connects, before the HTTP server starts.
  sensor_t *s = esp_camera_sensor_get();
  s->set_framesize(s, FRAMESIZE_QVGA);

  // ── WiFi ────────────────────────────────────────────────────
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setSleep(false);

  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (++attempts > 40) {
      Serial.println("\nWiFi timeout - rebooting");
      ESP.restart();
    }
  }
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("Camera IP: ");
  Serial.println(WiFi.localIP());

  // ── Handshake ───────────────────────────────────────────────
  registerWithBackend();

  // Upgrade resolution now that cam_task has been running stably at QVGA
  // for the entire WiFi connection duration. The DMA ring is settled.
  // Also apply flip/mirror here - safe to do now, sensor is fully stable.
  s->set_framesize(s, FRAMESIZE_SVGA);
  s->set_vflip(s, 1);
  s->set_hmirror(s, 1);
  Serial.println("Resolution upgraded to SVGA, orientation applied");

  // ── Start stream server ─────────────────────────────────────
  startCameraServer();

  Serial.printf("\nStream running at http://%s:%d/stream\n",
                WiFi.localIP().toString().c_str(), STREAM_PORT);
  Serial.println("Access it ONLY via the backend proxy - direct access requires bearer token.");
}

// ── loop() ───────────────────────────────────────────────────
void loop() {
  // All work is done in the httpd task.
  // Optionally: re-register with backend every 5 minutes
  // in case our IP lease changes or the backend restarted.
  static unsigned long lastReg = 0;
  if (millis() - lastReg > 5UL * 60UL * 1000UL) {
    if (WiFi.status() == WL_CONNECTED) {
      registerWithBackend();
    }
    lastReg = millis();
  }
  delay(10000);
}
