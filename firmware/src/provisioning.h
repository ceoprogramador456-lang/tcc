#pragma once
#include <ArduinoJson.h>
#include <Preferences.h>
#include <WiFi.h>
#include <esp_system.h>
#include "display.h"

inline Preferences preferences;
inline String wifiSsid, wifiPassword, apiUrl, rootCa, deviceToken, deviceId, sensorId;
inline String pairingKey, pairingCode, macAddress, serialLine;
inline bool discardingSerialLine = false;

inline void clearPairing() {
  deviceToken = ""; deviceId = ""; sensorId = ""; pairingKey = ""; pairingCode = "";
  preferences.remove("auth"); preferences.remove("pair_key");
}
inline String randomSecret() {
  uint8_t bytes[32]; esp_fill_random(bytes, sizeof(bytes));
  char value[65];
  for (size_t i = 0; i < sizeof(bytes); i++) snprintf(value + i * 2, 3, "%02x", bytes[i]);
  return String(value);
}
inline bool ensurePairingKey() {
  if (!pairingKey.isEmpty()) return true;
  String key = randomSecret();
  if (preferences.putString("pair_key", key) == 0) return false;
  pairingKey = key;
  return true;
}
inline bool saveCredential(const String& token, const String& id, const String& sensor) {
  if (token.isEmpty() || id.isEmpty() || sensor.isEmpty()) return false;
  JsonDocument doc; doc["token"] = token; doc["espId"] = id; doc["sensorId"] = sensor;
  String json; serializeJson(doc, json);
  if (preferences.putString("auth", json) == 0) return false;
  deviceToken = token; deviceId = id; sensorId = sensor;
  return true;
}
inline bool validApiUrl(const String& url) {
  if (url.startsWith("https://")) return url.length() > 12 && url.endsWith("/api");
  if (!url.startsWith("http://") || !url.endsWith("/api")) return false;
  String host = url.substring(7); int end = host.indexOf('/'); host = host.substring(0, end);
  int colon = host.indexOf(':'); if (colon >= 0) host = host.substring(0, colon);
  IPAddress ip;
  if (!ip.fromString(host)) return false;
  return ip[0] == 10 || (ip[0] == 172 && ip[1] >= 16 && ip[1] <= 31) || (ip[0] == 192 && ip[1] == 168);
}
inline void loadProvisioning() {
  if (!preferences.begin("siva", false)) { Serial.println("Falha ao abrir NVS."); return; }
  JsonDocument cfg;
  deserializeJson(cfg, preferences.getString("config", "{}"));
  wifiSsid = cfg["ssid"] | ""; wifiPassword = cfg["password"] | "";
  apiUrl = cfg["apiUrl"] | ""; rootCa = cfg["ca"] | "";
  JsonDocument auth; deserializeJson(auth, preferences.getString("auth", "{}"));
  deviceToken = auth["token"] | ""; deviceId = auth["espId"] | ""; sensorId = auth["sensorId"] | "";
  pairingKey = preferences.getString("pair_key", "");
}
inline void handleUsbCommand(const String& line) {
  JsonDocument cmd;
  if (deserializeJson(cmd, line)) { Serial.println("Comando JSON invalido."); return; }
  String action = cmd["command"] | "";
  if (action == "status") {
    Serial.printf("MAC: %s | Wi-Fi: %s | Pareada: %s\n", macAddress.c_str(),
      WiFi.status() == WL_CONNECTED ? "conectado" : "offline", deviceToken.isEmpty() ? "nao" : "sim");
    if (!pairingCode.isEmpty()) Serial.printf("Codigo: %s\n", pairingCode.c_str());
    return;
  }
  if (action == "forget-pairing") {
    clearPairing(); Serial.println("Credencial local removida. Autorize novo pareamento no painel."); return;
  }
  if (action != "configure") { Serial.println("Comandos: configure, status, forget-pairing."); return; }
  String ssid = cmd["ssid"] | ""; String password = cmd["password"] | "";
  String url = cmd["apiUrl"] | ""; String ca = cmd["ca"] | "";
  while (url.endsWith("/")) url.remove(url.length() - 1);
  if (ssid.isEmpty() || ssid.length() > 32 || password.length() > 63 || !validApiUrl(url) ||
      (url.startsWith("https://") && ca.isEmpty())) {
    Serial.println("Configuracao invalida: use SSID, senha e URL /api. HTTPS exige ca; HTTP somente em IP privado."); return;
  }
  if (url != apiUrl) clearPairing(); // Never send an existing credential to another server.
  JsonDocument cfg; cfg["ssid"] = ssid; cfg["password"] = password; cfg["apiUrl"] = url; cfg["ca"] = ca;
  String json; serializeJson(cfg, json);
  if (preferences.putString("config", json) == 0) { Serial.println("Falha ao salvar na NVS."); return; }
  wifiSsid = ssid; wifiPassword = password; apiUrl = url; rootCa = ca;
  WiFi.disconnect(); WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());
  Serial.println("Configuracao salva. Conectando ao Wi-Fi...");
}
inline void processUsb() {
  while (Serial.available()) {
    char c = static_cast<char>(Serial.read());
    if (c == '\n') {
      if (!discardingSerialLine && !serialLine.isEmpty()) handleUsbCommand(serialLine);
      serialLine = ""; discardingSerialLine = false;
    } else if (c != '\r' && !discardingSerialLine) {
      if (serialLine.length() < 8192) serialLine += c;
      else { serialLine = ""; discardingSerialLine = true; Serial.println("Comando muito longo."); }
    }
  }
}
