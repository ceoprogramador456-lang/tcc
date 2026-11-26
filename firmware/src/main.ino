#include <Arduino.h>
#include <WiFi.h>
#include <time.h>
#include <freertos/queue.h>
#include <freertos/task.h>
#include "config.h"
#include "sensor.h"
#include "display.h"
#include "wifi_manager.h"
#include "pairing.h"

static uint32_t lastSample;
static uint32_t lastDisplay;
static float lastFlow;
struct DeviceView {
  char espId[51];
  char code[7];
  const char* message;
};

static QueueHandle_t readings;
static QueueHandle_t deviceViews;
static DeviceView view{{}, {}, "Iniciando"};

static void apiTask(void*) {
  pairing::begin();
  for (;;) {
    pairing::tick();
    float flow;
    if (xQueueReceive(readings, &flow, 0) == pdTRUE) pairing::sendReading(flow);

    DeviceView current{{}, {}, pairing::message};
    pairing::state.espId.toCharArray(current.espId, sizeof(current.espId));
    pairing::state.code.toCharArray(current.code, sizeof(current.code));
    xQueueOverwrite(deviceViews, &current);
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

void setup() {
  Serial.begin(115200);
  setupDisplay();
  setupFlowSensor();
  lastSample = millis();

WiFi.onEvent([](WiFiEvent_t event, WiFiEventInfo_t info) {
  if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
    Serial.printf(
      "Wi-Fi desconectado! Motivo: %u\n",
      info.wifi_sta_disconnected.reason
    );
  }

  if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
    Serial.print("Wi-Fi conectado! IP: ");
    Serial.println(WiFi.localIP());
  }
});

  network::begin();
  Serial.print("MAC DO ESP32: ");
Serial.println(WiFi.macAddress());
  readings = xQueueCreate(1, sizeof(float));
  deviceViews = xQueueCreate(1, sizeof(DeviceView));
  if (!readings || !deviceViews ||
      xTaskCreate(apiTask, "siva-api", 12288, nullptr, 1, nullptr) != pdPASS) {
    view.message = "Falha tarefa da API";
    Serial.println(view.message);
  }
}

void loop() {
  network::tick();
  static bool wasOnline = false;
  const bool online = WiFi.status() == WL_CONNECTED;
  if (online && !wasOnline) configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  wasOnline = online;

  const uint32_t now = millis();
  const uint32_t elapsed = now - lastSample;
  if (elapsed >= SEND_INTERVAL_MS) {
    lastFlow = readFlowRate(elapsed);
    lastSample = now;
    Serial.printf("Vazao: %.2f L/min\n", lastFlow);
    if (readings && online) xQueueOverwrite(readings, &lastFlow);
  }
  if (now - lastDisplay >= 500) {
    lastDisplay = now;
    if (deviceViews) xQueuePeek(deviceViews, &view, 0);
    drawStatus(lastFlow, view.espId, online ? view.code : "",
               online && !network::storageError ? view.message : network::status());
  }

static uint32_t ultimoDiagnostico = 0;

if (millis() - ultimoDiagnostico >= 5000) {
  ultimoDiagnostico = millis();

  Serial.println("\n===== SIVA DIAGNOSTICO =====");

  Serial.print("Wi-Fi: ");
  Serial.println(
    WiFi.status() == WL_CONNECTED
      ? "CONECTADO"
      : "DESCONECTADO"
  );

  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  Serial.print("Estado: ");
  Serial.println(
    WiFi.status() == WL_CONNECTED
      ? view.message
      : network::status()
  );

  Serial.print("Codigo de pareamento: ");
  Serial.println(
    view.code[0] ? view.code : "AGUARDANDO"
  );

  Serial.println("===========================\n");
}

  delay(1);
}
