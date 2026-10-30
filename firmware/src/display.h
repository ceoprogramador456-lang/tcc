#pragma once
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>
#include "config.h"

inline Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);
inline bool displayReady = false;
inline bool setupDisplay() {
  Wire.begin(21, 22);
  displayReady = display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDRESS);
  if (!displayReady) Serial.println("OLED indisponivel. O codigo tambem aparece no USB.");
  return displayReady;
}
inline void showMessage(const char* title, const char* line1, const char* line2) {
  if (!displayReady) return;
  display.clearDisplay(); display.setTextSize(1); display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0); display.println(title); display.println();
  display.println(line1); display.println(line2); display.display();
}
inline void showPairing(const String& code) {
  if (!displayReady) return;
  display.clearDisplay(); display.setTextColor(SSD1306_WHITE); display.setTextSize(1);
  display.setCursor(0, 0); display.println("SIVA - pareamento");
  display.setCursor(0, 22); display.setTextSize(2);
  display.print(code.substring(0, 4)); display.print('-'); display.print(code.substring(4));
  display.setTextSize(1); display.setCursor(0, 52); display.print("Aprove no painel"); display.display();
}
inline void showReading(float flow, bool delivered) {
  if (!displayReady) return;
  display.clearDisplay(); display.setTextColor(SSD1306_WHITE); display.setTextSize(1);
  display.setCursor(0, 0); display.println("SIVA - monitorando");
  display.println(delivered ? "API: leitura recebida" : "API: envio pendente");
  display.setCursor(0, 36); display.setTextSize(2); display.printf("%.2f L/min", flow); display.display();
}
