#pragma once

// O endereço do backend fica em secrets.h (gitignored) — copie
// secrets.h.example para secrets.h e preencha antes de gravar no ESP32.
// A credencial do Wi-Fi NÃO mora aqui: é informada uma vez pelo portal de
// configuração e gravada na NVS do próprio ESP32 (ver wifi_manager.h).
#include "secrets.h"

// Portal de configuração do Wi-Fi. Sem rede salva, o ESP32 sobe este access
// point; o usuário conecta pelo celular e escolhe a rede numa lista.
#define WIFI_PORTAL_SSID "SIVA-setup"
// WPA2 exige no mínimo 8 caracteres.
#define WIFI_PORTAL_PASSWORD "siva1234"

// Tempo tentando a rede já salva antes de abrir o portal.
#define WIFI_CONNECT_TIMEOUT_S 20
// Tempo com o portal aberto antes de desistir e seguir offline. Sem esse limite
// o boot travaria indefinidamente enquanto ninguém configurasse a rede.
#define WIFI_PORTAL_TIMEOUT_S 180

#define API_PORT 3000
#define API_PATH "/api/readings"

// Credencial do dispositivo, gerada pelo backend na criação do ESP32 (ver docs/AUTHENTICATION.md).
#define DEVICE_X_TOKEN "dev-token-esp01"

// Identificação enviada em cada leitura — deve bater com o registro do dispositivo no backend.
#define ESP_ID "esp_01"
#define SETOR "producao"
#define SENSOR_ID "sensor_01"

// Pino digital conectado ao sinal do sensor de fluxo YF-S201.
#define FLOW_SENSOR_PIN 27

// Pulsos por segundo por litro/minuto — constante de calibração do YF-S201 (datasheet do fabricante).
#define FLOW_CALIBRATION_FACTOR 7.5f

// Display OLED SSD1306 via I2C (pinos padrão do ESP32: SDA=21, SCL=22).
#define OLED_WIDTH 128
#define OLED_HEIGHT 64
#define OLED_I2C_ADDRESS 0x3C

// Intervalo entre leituras/envios para a API.
#define SEND_INTERVAL_MS 5000
