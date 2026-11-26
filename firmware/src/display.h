#pragma once

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>
#include "config.h"

static Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);
static bool displayReady = false;

inline void setupDisplay() {
  displayReady = display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDRESS);
  if (!displayReady) Serial.println("Falha ao iniciar o OLED.");
}

inline void drawStatus(float flow, const char* espId, const char* code, const char* message) {
  if (!displayReady) return;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(espId[0] ? espId : "SIVA - ESP32");
  display.println(message);
  if (code[0]) {
    display.setTextSize(2);
    display.println(code);
  }
  display.setTextSize(1);
  display.printf("%.2f L/min", flow);
  display.display();
}
