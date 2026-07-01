// =============================================================
// CAMron - Main sketch for ESP32-CAM (AI-Thinker / OV2640)
// Compiled via arduino-cli with the same toolchain as Arduino IDE
// =============================================================

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include "config.h"

// AI-Thinker pin map
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

#define FLASH_GPIO_NUM 4
#include "esp_arduino_version.h"

void setFlash(int value) {
  #if defined(ESP_ARDUINO_VERSION) && ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
    ledcWrite(FLASH_GPIO_NUM, value);
  #else
    ledcWrite(LEDC_CHANNEL_4, value);
  #endif
  Serial.printf("Flash set to %d\n", value);
}

// Startup handshake
// Tell the backend our IP so it can proxy to us.
static void registerWithBackend() {
  HTTPClient http;

  String url = String("http://") + BACKEND_HOST + ":" + String(BACKEND_PORT) + BACKEND_PATH;
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

// setup()
void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println("\n\n=== CAMron booting ===");



  // Camera init
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

  // Flash LED setup
  #if defined(ESP_ARDUINO_VERSION) && ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
    ledcAttach(FLASH_GPIO_NUM, 5000, 8);
    ledcWrite(FLASH_GPIO_NUM, 0);
  #else
    ledcSetup(LEDC_CHANNEL_4, 5000, 8);
    ledcAttachPin(FLASH_GPIO_NUM, LEDC_CHANNEL_4);
    ledcWrite(LEDC_CHANNEL_4, 0);
  #endif

  sensor_t *s = esp_camera_sensor_get();
  s->set_framesize(s, FRAMESIZE_QVGA);

  // WiFi
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

  // First Boot NVS Check & Confirmation
  Preferences preferences;
  preferences.begin("camron", false);
  String storedId = preferences.getString("camera_id", "");
  bool firstBoot = (storedId != CAMERA_ID);
  if (firstBoot) {
    Serial.println("First boot detected! Sending confirmation to backend...");
    HTTPClient http;
    String confirmUrl = String("http://") + BACKEND_HOST + ":" + String(BACKEND_PORT) + "/api/confirm-flash";
    http.begin(confirmUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " CAMERA_BEARER_TOKEN);

    String body = "{\"id\":\"" CAMERA_ID "\"}";
    int confirmCode = http.POST(body);
    if (confirmCode > 0) {
      Serial.printf("Confirm responded: %d\n", confirmCode);
      if (confirmCode == 200 || confirmCode == 201) {
        preferences.putString("camera_id", CAMERA_ID);
        Serial.println("First boot confirmation successful. Stored camera_id in NVS.");
      }
    } else {
      Serial.printf("Confirm failed: %s\n", http.errorToString(confirmCode).c_str());
    }
    http.end();
  } else {
    Serial.println("Not a first boot. Skipping NVS confirmation.");
  }
  preferences.end();

  // Handshake
  registerWithBackend();

  s->set_framesize(s, FRAMESIZE_SVGA);
  s->set_vflip(s, 1);
  s->set_hmirror(s, 1);
  Serial.println("Resolution upgraded to SVGA, orientation applied");

  // Start stream server
  startCameraServer();

  Serial.printf("\nStream running at http://%s:%d/stream\n",
                WiFi.localIP().toString().c_str(), STREAM_PORT);
}

// loop()
void loop() {
  static unsigned long lastReg = 0;
  if (millis() - lastReg > 5UL * 60UL * 1000UL) {
    if (WiFi.status() == WL_CONNECTED) {
      registerWithBackend();
    }
    lastReg = millis();
  }
  delay(10000);
}
