#pragma once

#if __has_include("secrets.h")
#include "secrets.h"
#else
#include "secrets.h.example"
#endif

#ifndef API_PORT
#define API_PORT 443
#endif

#define DEVICE_MODEL "ESP32 DevKit"
#define FIRMWARE_VERSION "1.0.0"
#define SENSOR_ID "sensor_01"

#define FLOW_SENSOR_PIN 27
#define FLOW_CALIBRATION_FACTOR 7.5f
#define OLED_WIDTH 128
#define OLED_HEIGHT 64
#define OLED_I2C_ADDRESS 0x3C
#define SEND_INTERVAL_MS 5000UL
