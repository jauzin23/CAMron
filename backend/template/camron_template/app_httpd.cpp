// =============================================================
// CAMron - Stripped MJPEG stream server for ESP32-CAM (AI-Thinker)
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

#define PART_BOUNDARY "123456789000000000000987654321"
static const char *_STREAM_CONTENT_TYPE =
    "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char *_STREAM_BOUNDARY =
    "\r\n--" PART_BOUNDARY "\r\n";
static const char *_STREAM_PART =
    "Content-Type: image/jpeg\r\nContent-Length: %u\r\nX-Timestamp: %d.%06d\r\n\r\n";

static httpd_handle_t stream_httpd = NULL;
static httpd_handle_t control_httpd = NULL;

// Returns true if the request carries the correct bearer token.
static bool check_bearer(httpd_req_t *req) {
  char auth_buf[80];
  // Reject if no Authorization header or buffer too small
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

static esp_err_t stream_handler(httpd_req_t *req) {
  // ❶ Auth gate - first thing, no exceptions
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

  // Don't expose camera to cross-origin - intentionally omit CORS wildcard
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

extern void setFlash(int value);

static esp_err_t flash_handler(httpd_req_t *req) {
  if (!check_bearer(req)) {
    return send_401(req);
  }

  char content[100];
  size_t recv_size = req->content_len;
  if (recv_size >= sizeof(content)) {
    recv_size = sizeof(content) - 1;
  }
  int ret = httpd_req_recv(req, content, recv_size);
  if (ret <= 0) {
    if (ret == HTTPD_SOCK_ERR_TIMEOUT) {
      httpd_resp_send_408(req);
    }
    return ESP_FAIL;
  }
  content[ret] = '\0';

  int val = 0;
  char *p = strstr(content, "\"value\"");
  if (p) {
    p = strchr(p, ':');
    if (p) {
      p++;
      while (*p == ' ' || *p == '\t') p++;
      val = atoi(p);
    }
  }

  setFlash(val);

  httpd_resp_set_type(req, "application/json");
  char resp_str[64];
  snprintf(resp_str, sizeof(resp_str), "{\"ok\":true,\"value\":%d}", val);
  httpd_resp_sendstr(req, resp_str);
  return ESP_OK;
}

// rejects everything that isn't /stream
// Registered as a wildcard URI so stray requests get 401, not 404.
static esp_err_t reject_handler(httpd_req_t *req) {
  return send_401(req);
}

void startCameraServer() {
  // 1. Control server (port 80)
  httpd_config_t control_config = HTTPD_DEFAULT_CONFIG();
  control_config.server_port = CONTROL_PORT;
  control_config.ctrl_port = 32768;
  control_config.max_uri_handlers = 3;

  httpd_uri_t flash_uri = {
    .uri     = "/flash",
    .method  = HTTP_POST,
    .handler = flash_handler,
    .user_ctx = NULL
  };

  httpd_uri_t reject_uri = {
    .uri     = "/*",
    .method  = HTTP_GET,
    .handler = reject_handler,
    .user_ctx = NULL
  };

  log_i("Starting control server on port %d", control_config.server_port);
  if (httpd_start(&control_httpd, &control_config) == ESP_OK) {
    httpd_register_uri_handler(control_httpd, &flash_uri);
    httpd_register_uri_handler(control_httpd, &reject_uri);
    log_i("Control server started on port %d", control_config.server_port);
  } else {
    log_e("Failed to start control server!");
  }

  // 2. Stream server (port 81)
  httpd_config_t stream_config = HTTPD_DEFAULT_CONFIG();
  stream_config.server_port = STREAM_PORT;
  stream_config.ctrl_port = 32769;
  stream_config.max_uri_handlers = 2;

  httpd_uri_t stream_uri = {
    .uri     = "/stream",
    .method  = HTTP_GET,
    .handler = stream_handler,
    .user_ctx = NULL
  };

  log_i("Starting stream server on port %d", stream_config.server_port);
  if (httpd_start(&stream_httpd, &stream_config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    log_i("Stream server started on port %d", stream_config.server_port);
  } else {
    log_e("Failed to start stream server!");
  }
}

