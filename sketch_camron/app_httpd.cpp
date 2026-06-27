// =============================================================
// CAMron — Stripped MJPEG stream server for ESP32-CAM (AI-Thinker)
// Only serves /stream on STREAM_PORT, protected by bearer token.
// All other requests → 401 Unauthorized.
// =============================================================

#include "esp_http_server.h"
#include "esp_timer.h"
#include "esp_camera.h"
#include "img_converters.h"
#include "config.h"

#if defined(ARDUINO_ARCH_ESP32) && defined(CONFIG_ARDUHAL_ESP_LOG)
#include "esp32-hal-log.h"
#endif

// ── MJPEG multipart boundary ─────────────────────────────────
#define PART_BOUNDARY "123456789000000000000987654321"
static const char *_STREAM_CONTENT_TYPE =
    "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char *_STREAM_BOUNDARY =
    "\r\n--" PART_BOUNDARY "\r\n";
static const char *_STREAM_PART =
    "Content-Type: image/jpeg\r\nContent-Length: %u\r\nX-Timestamp: %d.%06d\r\n\r\n";

static httpd_handle_t stream_httpd = NULL;

// ── Bearer token validation ───────────────────────────────────
// Returns true if the request carries the correct bearer token.
static bool check_bearer(httpd_req_t *req) {
  char auth_buf[80];
  // Silently reject if no Authorization header or buffer too small
  if (httpd_req_get_hdr_value_str(req, "Authorization", auth_buf, sizeof(auth_buf)) != ESP_OK) {
    return false;
  }
  // Expected: "Bearer <token>"
  char expected[72];
  snprintf(expected, sizeof(expected), "Bearer %s", CAMERA_BEARER_TOKEN);
  return (strcmp(auth_buf, expected) == 0);
}

// Send 401 and close
static esp_err_t send_401(httpd_req_t *req) {
  httpd_resp_set_status(req, "401 Unauthorized");
  httpd_resp_set_type(req, "text/plain");
  httpd_resp_sendstr(req, "Unauthorized");
  return ESP_FAIL;
}

// ── Stream handler ────────────────────────────────────────────
static esp_err_t stream_handler(httpd_req_t *req) {
  // ❶ Auth gate — first thing, no exceptions
  if (!check_bearer(req)) {
    return send_401(req);
  }

  camera_fb_t *fb    = NULL;
  struct timeval ts;
  esp_err_t res      = ESP_OK;
  size_t jpg_len     = 0;
  uint8_t *jpg_buf   = NULL;
  char part_buf[128];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  // Don't expose camera to cross-origin — intentionally omit CORS wildcard
  // (backend proxy is the only legitimate caller)

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      log_e("Camera capture failed");
      res = ESP_FAIL;
    } else {
      ts.tv_sec  = fb->timestamp.tv_sec;
      ts.tv_usec = fb->timestamp.tv_usec;

      if (fb->format != PIXFORMAT_JPEG) {
        bool ok = frame2jpg(fb, 80, &jpg_buf, &jpg_len);
        esp_camera_fb_return(fb);
        fb = NULL;
        if (!ok) {
          log_e("JPEG compression failed");
          res = ESP_FAIL;
        }
      } else {
        jpg_len = fb->len;
        jpg_buf = fb->buf;
      }
    }

    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    }
    if (res == ESP_OK) {
      size_t hlen = snprintf(part_buf, sizeof(part_buf), _STREAM_PART,
                             jpg_len, (int)ts.tv_sec, (int)ts.tv_usec);
      res = httpd_resp_send_chunk(req, part_buf, hlen);
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)jpg_buf, jpg_len);
    }

    // Return / free frame buffer
    if (fb) {
      esp_camera_fb_return(fb);
      fb      = NULL;
      jpg_buf = NULL;
    } else if (jpg_buf) {
      free(jpg_buf);
      jpg_buf = NULL;
    }

    if (res != ESP_OK) {
      log_e("Stream send failed, closing connection");
      break;
    }
  }

  return res;
}

// ── Catch-all handler — rejects everything that isn't /stream ─
// Registered as a wildcard URI so stray requests get 401, not 404.
static esp_err_t reject_handler(httpd_req_t *req) {
  return send_401(req);
}

// ── Public entry point ────────────────────────────────────────
void startCameraServer() {
  httpd_config_t config  = HTTPD_DEFAULT_CONFIG();
  config.server_port     = STREAM_PORT;
  config.ctrl_port       = STREAM_PORT + 32; // avoid collision with default 32768
  config.max_uri_handlers = 4;

  httpd_uri_t stream_uri = {
    .uri     = "/stream",
    .method  = HTTP_GET,
    .handler = stream_handler,
    .user_ctx = NULL
  };

  // Wildcard: catch every other URI and return 401
  httpd_uri_t reject_uri = {
    .uri     = "/*",
    .method  = HTTP_GET,
    .handler = reject_handler,
    .user_ctx = NULL
  };

  log_i("Starting stream server on port %d", config.server_port);
  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    httpd_register_uri_handler(stream_httpd, &reject_uri);
    log_i("Stream server started — /stream is bearer-protected");
  } else {
    log_e("Failed to start stream server!");
  }
}
