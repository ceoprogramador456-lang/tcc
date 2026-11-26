#pragma once

#include <ArduinoJson.h>
#include <Preferences.h>
#include <WiFi.h>
#include <esp_wifi.h>

namespace network {
static Preferences storage;
static bool storageReady = false;
static bool storageError = false;
static bool configured = false;
static bool radioReady = false;
static bool reconnectRequested = false;
static String ssid;
static String password;
static uint32_t lastAttempt;
static uint32_t retryMs = 10000;
static char serialLine[640];
static size_t serialLength = 0;
static bool discardLine = false;

inline bool readConfig(const JsonDocument& doc, String& name, String& key) {
  const JsonString rawName = doc["ssid"].as<JsonString>();
  const JsonString rawKey = doc["password"].as<JsonString>();
  if (rawName.isNull() || rawKey.isNull() || rawName.size() == 0 || rawName.size() > 32 ||
      strlen(rawName.c_str()) != rawName.size() || strlen(rawKey.c_str()) != rawKey.size()) {
    return false;
  }
  const size_t length = rawKey.size();
  if ((length > 0 && length < 8) || length > 64 ||
      (length == 64 && strspn(rawKey.c_str(), "0123456789abcdefABCDEF") != length)) {
    return false;
  }
  for (size_t i = 0; i < length; ++i) {
    const unsigned char character = rawKey.c_str()[i];
    if (character < 32 || character > 126) return false;
  }
  name = rawName.c_str();
  key = rawKey.c_str();
  return name.length() == rawName.size() && key.length() == length;
}

inline void connect() {
  lastAttempt = millis();
  if (ssid.isEmpty()) WiFi.begin();  // Configuracao STA persistida pelo firmware anterior.
  else WiFi.begin(ssid.c_str(), password.c_str());
}

inline void begin() {
  // Inicie com o armazenamento do driver para recuperar redes de firmwares anteriores.
  radioReady = WiFi.mode(WIFI_STA) && esp_wifi_set_storage(WIFI_STORAGE_RAM) == ESP_OK;
  WiFi.persistent(false);
  WiFi.setAutoReconnect(false);
  storageReady = storage.begin("siva-wifi", false);
  storageError = !storageReady;
  if (storageReady && storage.isKey("network")) {
    JsonDocument doc;
    configured = !deserializeJson(doc, storage.getString("network")) &&
                 readConfig(doc, ssid, password);
    storageError = !configured;
    if (!configured) ssid = password = "";
  }
  if (!configured) {
    wifi_config_t legacy{};
    configured = esp_wifi_get_config(WIFI_IF_STA, &legacy) == ESP_OK && legacy.sta.ssid[0];
  }
  if (configured && radioReady) connect();
  Serial.println("Wi-Fi por USB: envie JSON com ssid e password a 115200 baud.");
}

inline void serialSetup() {
  // Limita o trabalho por ciclo mesmo durante uma transferencia continua.
  for (size_t i = 0; i < 128 && Serial.available(); ++i) {
    const int incoming = Serial.read();
    if (incoming == '\r') continue;
    if (incoming != '\n') {
      if (incoming == 0 || serialLength == sizeof(serialLine) - 1) discardLine = true;
      if (!discardLine) serialLine[serialLength++] = char(incoming);
      continue;
    }

    serialLine[serialLength] = '\0';
    JsonDocument doc;
    String name, key;
    const bool valid = !discardLine && !deserializeJson(doc, serialLine) &&
                       readConfig(doc, name, key);
    memset(serialLine, 0, sizeof(serialLine));
    serialLength = 0;
    discardLine = false;
    if (!valid) {
      Serial.println("Configuracao Wi-Fi invalida.");
      continue;
    }

    doc.clear();
    doc["ssid"] = name;
    doc["password"] = key;
    String serialized;
    if (!storageReady) storageReady = storage.begin("siva-wifi", false);
    if (!storageReady || !serializeJson(doc, serialized) ||
        storage.putString("network", serialized) != serialized.length()) {
      storageError = true;
      Serial.println("Falha ao gravar Wi-Fi na NVS.");
      continue;
    }

    ssid = name;
    password = key;
    configured = true;
    storageError = false;
    retryMs = 10000;
    WiFi.disconnect(false, false);
    reconnectRequested = true;
    Serial.println("Tentando conectar ao Wi-Fi configurado via USB.");
  }
}

inline void tick() {
  serialSetup();
  if (!configured || !radioReady) return;
  if (reconnectRequested) {
    if (WiFi.status() == WL_CONNECTED) {
      if (millis() - lastAttempt >= retryMs) {
        lastAttempt = millis();
        WiFi.disconnect(false, false);
      }
      return;
    }
    reconnectRequested = false;
    connect();
    return;
  }
  if (WiFi.status() == WL_CONNECTED) {
    retryMs = 10000;
    lastAttempt = millis();
  } else if (millis() - lastAttempt >= retryMs) {
    WiFi.disconnect(false, false);
    connect();
    retryMs = min(60000UL, retryMs * 2UL);
  }
}

inline const char* status() {
  if (!radioReady) return "Falha radio Wi-Fi";
  if (storageError) return "Falha NVS Wi-Fi";
  return configured ? "Reconectando Wi-Fi" : "Configurar via USB";
}
}  // namespace network
