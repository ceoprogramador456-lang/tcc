#pragma once

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WiFi.h>
#include <mbedtls/ssl.h>
#include <time.h>
#include "config.h"

static constexpr uint32_t apiTimeoutMs = 5000;

enum ApiFailure { ApiOffline = -1000, ApiDns, ApiTls, ApiTimeout, ApiInvalid };

inline const char* apiFailureMessage(int status, const char* fallback) {
  switch (status) {
    case ApiOffline: return "Wi-Fi offline";
    case ApiDns: return "Falha DNS da API";
    case ApiTls: return "Falha TLS da API";
    case ApiTimeout: return "Tempo limite da API";
    case ApiInvalid: return "Resposta API invalida";
    default: return fallback;
  }
}

// O corpo nunca é registrado: respostas de descoberta e retirada contêm segredos.
inline int apiRequest(const char* path, const char* header, const String& credential,
                      const JsonDocument* payload, JsonDocument* result = nullptr) {
  if (WiFi.status() != WL_CONNECTED) return ApiOffline;
  IPAddress address;
  if (!WiFi.hostByName(API_HOST, address)) return ApiDns;

  WiFiClientSecure tls;
  tls.setCACert(API_ROOT_CA);
  tls.setHandshakeTimeout(5);
  HTTPClient http;
  http.setConnectTimeout(apiTimeoutMs);
  http.setTimeout(apiTimeoutMs);
  http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS);
  // O DNS antecipado diagnostica falhas. A conexao TLS usa o nome do servidor.
  String url = String("https://") + API_HOST + ":" + API_PORT + path;
  if (!http.begin(tls, url)) return ApiInvalid;
  http.addHeader(header, credential);
  int status;
  const uint32_t startedAt = millis();
  if (payload) {
    String body;
    serializeJson(*payload, body);
    http.addHeader("Content-Type", "application/json");
    status = http.POST(body);
  } else {
    status = http.GET();
  }
  if (status < 0) {
    char error[128];
    const int tlsError = tls.lastError(error, sizeof(error));
    Serial.printf("Transporte ESP32: HTTP=%d TLS=%d\n", status, tlsError);
    if (WiFi.status() != WL_CONNECTED) status = ApiOffline;
    else if (status == HTTPC_ERROR_READ_TIMEOUT || tlsError == MBEDTLS_ERR_SSL_TIMEOUT ||
             (tlsError == -1 && millis() - startedAt >= apiTimeoutMs))
      status = ApiTimeout;
    else if (tlsError < -0x10) status = ApiTls;
    else if (status == HTTPC_ERROR_NO_HTTP_SERVER || status == HTTPC_ERROR_ENCODING)
      status = ApiInvalid;
  } else if (status == 401 || (result && status >= 200 && status < 300)) {
    JsonDocument error;
    JsonDocument& doc = status == 401 ? error : *result;
    if (deserializeJson(doc, http.getString()) != DeserializationError::Ok ||
        (status == 401 ? (doc["error"]["code"] != "UNAUTHORIZED" || doc["success"] != false)
                       : (doc["success"] != true || !doc["data"].is<JsonObject>()))) {
      status = ApiInvalid;
    }
  }
  http.end();
  return status;
}
