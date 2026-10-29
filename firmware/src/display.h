#pragma once

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>

#include "config.h"

inline Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

inline bool setupDisplay() {
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDRESS)) {
    Serial.println("Falha ao iniciar o display OLED SSD1306");
    return false;
  }
  display.clearDisplay();
  display.display();
  return true;
}

// Tela de texto simples, usada para status de boot e instruções do portal Wi-Fi.
inline void showMessage(const char* title, const char* line1, const char* line2) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(title);
  display.println();
  display.println(line1);
  display.println(line2);
  display.display();
}

inline void showReading(float vazao, bool wifiConnected) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.printf("SIVA - %s\n", ESP_ID);
  display.printf("Wi-Fi: %s\n", wifiConnected ? "conectado" : "offline");
  display.println();
  display.setTextSize(2);
  display.printf("%.2f L/min", vazao);
  display.display();
}
