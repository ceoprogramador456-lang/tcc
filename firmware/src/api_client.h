#pragma once
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <time.h>
#include "provisioning.h"

inline int apiPost(const char* path, JsonDocument& payload, const char* header, const String& secret, JsonDocument& response) {
  if (WiFi.status() != WL_CONNECTED || !validApiUrl(apiUrl)) return -1;
  WiFiClient plain;
  WiFiClientSecure secure;
  HTTPClient http;
  String url = apiUrl + path;
  if (url.startsWith("https://")) {
    if (rootCa.isEmpty() || time(nullptr) < 1700000000) return -2;
    secure.setCACert(rootCa.c_str());
    if (!http.begin(secure, url)) return -1;
  } else if (!http.begin(plain, url)) return -1;
  http.setConnectTimeout(3000); http.setTimeout(4000);
  http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader(header, secret);
  String body; serializeJson(payload, body);
  int status = http.POST(body);
  if (status > 0) deserializeJson(response, http.getString());
  http.end(); return status;
}
