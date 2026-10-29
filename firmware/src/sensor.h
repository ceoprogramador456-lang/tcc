#pragma once

#include <Arduino.h>

#include "config.h"

namespace {
volatile uint32_t pulseCount = 0;

void IRAM_ATTR onFlowPulse() {
  pulseCount++;
}
}  // namespace

inline void setupFlowSensor() {
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), onFlowPulse, FALLING);
}

// Lê e zera o contador de pulsos acumulado desde a última chamada, convertendo para
// L/min a partir da constante de calibração do YF-S201 e do tempo decorrido.
inline float readFlowRate(uint32_t elapsedMs) {
  noInterrupts();
  uint32_t pulses = pulseCount;
  pulseCount = 0;
  interrupts();

  float pulsesPerSecond = pulses / (elapsedMs / 1000.0f);
  return pulsesPerSecond / FLOW_CALIBRATION_FACTOR;
}
