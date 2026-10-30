#include <Arduino.h>
#include "config.h"
#include "sensor.h"
#include "api_client.h"

unsigned long lastSendAt = 0, lastPairAt = 0, lastReconnectAt = 0;
unsigned long pairingInterval = 5000;
bool clockStarted = false;

void pairDevice() {
  if (!ensurePairingKey()) { showMessage("SIVA", "Falha na memoria", "Verifique o USB"); return; }
  JsonDocument payload, response;
  payload["macAddress"] = macAddress;
  const bool requesting = pairingCode.isEmpty();
  if (requesting) payload["sensorId"] = SENSOR_ID;
  int status = apiPost(requesting ? "/device-pairings/request" : "/device-pairings/status",
    payload, "X-Pairing-Key", pairingKey, response);
  pairingInterval = (status == 429 || status == 409 || status < 0 || status >= 500) ? 60000 : 5000;
  if (status == 404) { clearPairing(); return; }
  if (status < 200 || status >= 300 || response["success"] != true) {
    Serial.printf("Pareamento: HTTP %d. Nova tentativa automatica.\n", status);
    showMessage("SIVA - pareamento", status == 409 ? "Verifique no painel" : "Aguardando servidor", "Consulte o USB"); return;
  }
  if (requesting) {
    pairingCode = response["data"]["code"].as<String>();
    Serial.printf("Codigo de pareamento: %s (10 minutos).\n", pairingCode.c_str());
    showPairing(pairingCode); return;
  }
  String state = response["data"]["status"] | "";
  if (state == "APPROVED") {
    if (!saveCredential(response["data"]["token"].as<String>(), response["data"]["espId"].as<String>(), response["data"]["sensorId"].as<String>())) {
      Serial.println("Credencial nao salva. Repetindo entrega."); return;
    }
    JsonDocument ack; apiPost("/device-pairings/acknowledge", payload, "X-Pairing-Key", pairingKey, ack);
    pairingKey = ""; pairingCode = ""; preferences.remove("pair_key");
    readFlowRate(millis() - lastSendAt + 1); lastSendAt = millis();
    Serial.println("Pareamento concluido. Credencial salva; iniciando leituras.");
    showMessage("SIVA - conectado", "Pareamento aprovado", "Iniciando leituras");
  } else if (state == "DELIVERED") {
    showMessage("SIVA", "Credencial ausente", "Repareie pelo painel"); pairingInterval = 60000;
  } else showPairing(pairingCode);
}
void sendReading(float flow) {
  JsonDocument payload, response;
  payload["esp_id"] = deviceId; payload["sensor_id"] = sensorId; payload["vazao"] = flow;
  int status = apiPost("/readings", payload, "X-Token", deviceToken, response);
  bool delivered = status >= 200 && status < 300 && response["success"] == true;
  showReading(flow, delivered);
  Serial.printf("Vazao %.2f L/min | HTTP %d | %s\n", flow, status, delivered ? "recebida" : "nao recebida");
  if (status == 401) { clearPairing(); lastPairAt = millis() - 5000; pairingInterval = 5000; }
}
void setup() {
  Serial.begin(115200); setupDisplay();
  WiFi.mode(WIFI_STA); WiFi.setAutoReconnect(true); macAddress = WiFi.macAddress();
  loadProvisioning(); setupFlowSensor();
  Serial.printf("SIVA | MAC %s | comandos JSON por USB a 115200 baud.\n", macAddress.c_str());
  if (!wifiSsid.isEmpty()) WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());
  else showMessage("SIVA - instalacao", "Configure pelo USB", "115200 baud");
  lastSendAt = millis(); lastPairAt = millis() - 5000; lastReconnectAt = millis();
}
void loop() {
  processUsb();
  unsigned long now = millis();
  if (WiFi.status() != WL_CONNECTED) {
    if (!wifiSsid.isEmpty() && now - lastReconnectAt >= 30000) {
      lastReconnectAt = now; WiFi.disconnect(); WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());
    }
    if (now - lastSendAt >= SEND_INTERVAL_MS) {
      readFlowRate(now - lastSendAt); lastSendAt = now;
      showMessage("SIVA", "Wi-Fi desconectado", "Configure pelo USB");
    }
    delay(5); return;
  }
  if (!clockStarted) { configTime(0, 0, "pool.ntp.org", "time.nist.gov"); clockStarted = true; }
  if (deviceToken.isEmpty()) {
    if (now - lastPairAt >= pairingInterval) { lastPairAt = now; pairDevice(); }
    // pairDevice may reset lastSendAt after a blocking request; refresh the clock.
    now = millis();
    if (now - lastSendAt >= SEND_INTERVAL_MS) { readFlowRate(now - lastSendAt); lastSendAt = now; }
  } else if (now - lastSendAt >= SEND_INTERVAL_MS) {
    float flow = readFlowRate(now - lastSendAt); lastSendAt = now; sendReading(flow);
  }
  delay(5);
}
