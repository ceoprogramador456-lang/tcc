#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

#include "config.h"
#include "display.h"
#include "sensor.h"
#include "wifi_manager.h"

unsigned long lastSendAt = 0;

void sendReading(float vazao) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi desconectado, pulando envio.");
    return;
  }

  HTTPClient http;
  String url = String("http://") + API_HOST + ":" + API_PORT + API_PATH;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Token", DEVICE_X_TOKEN);

  JsonDocument payload;
  payload["esp_id"] = ESP_ID;
  payload["setor"] = SETOR;
  payload["sensor_id"] = SENSOR_ID;
  payload["vazao"] = vazao;

  String body;
  serializeJson(payload, body);

  int statusCode = http.POST(body);
  if (statusCode > 0) {
    Serial.printf("Leitura enviada (vazao=%.2f L/min) -> HTTP %d\n", vazao, statusCode);
  } else {
    Serial.printf("Falha ao enviar leitura: %s\n", http.errorToString(statusCode).c_str());
  }
  http.end();
}

void setup() {
  Serial.begin(115200);

  // O display sobe primeiro para conseguir mostrar as instruções do portal
  // Wi-Fi. O sensor sobe por último: o contador de pulsos só deve começar
  // depois da conexão, senão o tempo parado no portal viraria uma vazão falsa
  // na primeira leitura.
  setupDisplay();
  showMessage("SIVA", "Iniciando...", "");
  connectWiFi();
  setupFlowSensor();

  lastSendAt = millis();
}

void loop() {
  unsigned long now = millis();
  unsigned long elapsed = now - lastSendAt;

  if (elapsed >= SEND_INTERVAL_MS) {
    float vazao = readFlowRate(elapsed);
    Serial.printf("Vazao: %.2f L/min\n", vazao);
    showReading(vazao, WiFi.status() == WL_CONNECTED);
    sendReading(vazao);
    lastSendAt = now;
  }
}
