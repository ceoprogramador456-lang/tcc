#pragma once

#include <Arduino.h>
#include <Preferences.h>
#include <esp_system.h>
#include "api_client.h"

namespace pairing {
struct State {
  String secret;
  String session;
  String code;
  String token;
  String espId;
};

static Preferences storage;
static State state;
static bool storageReady = false;
static bool storageOpen = false;
static uint32_t lastStorageRead;
static bool authenticated = false;
static bool wasOnline = false;
static String mac;
static uint32_t lastRequest = 0;
static bool attemptedRequest = false;
static uint32_t retryMs = 5000;
static const char* message = "Iniciando";

inline bool save(const State& next) {
  JsonDocument doc;
  doc["secret"] = next.secret;
  doc["session"] = next.session;
  doc["code"] = next.code;
  doc["token"] = next.token;
  doc["espId"] = next.espId;
  String serialized;
  if (!serializeJson(doc, serialized) ||
      storage.putString("state", serialized) != serialized.length()) {
    message = "Falha ao gravar NVS";
    return false;
  }
  state = next;
  return true;
}

inline void begin() {
  lastStorageRead = millis();
  mac = WiFi.macAddress();
  message = "Falha ao ler NVS";
  if (!storageOpen) storageOpen = storage.begin("siva-device", false);
  if (!storageOpen) return;
  if (storage.isKey("state")) {
    JsonDocument doc;
    if (deserializeJson(doc, storage.getString("state")) != DeserializationError::Ok) return;
    state.secret = doc["secret"] | "";
    state.session = doc["session"] | "";
    state.code = doc["code"] | "";
    state.token = doc["token"] | "";
    state.espId = doc["espId"] | "";
  }
  storageReady = true;
  message = "Aguardando rede";
}

inline bool forgetRevoked() {
  authenticated = false;
  if (!save(State{})) return false;
  message = "Credencial revogada";
  return true;
}

inline bool discover() {
  if (state.secret.isEmpty()) {
    uint8_t random[32];
    esp_fill_random(random, sizeof(random));
    char encoded[65];
    for (size_t i = 0; i < sizeof(random); i++)
      snprintf(encoded + 2 * i, 3, "%02x", static_cast<unsigned>(random[i]));
    State next;
    next.secret = encoded;
    if (!save(next)) return false;
  }

  JsonDocument payload, result;
  payload["mac"] = mac;
  payload["firmwareVersion"] = FIRMWARE_VERSION;
  payload["model"] = DEVICE_MODEL;
  payload["sensorId"] = SENSOR_ID;

int status = apiRequest("/api/devices/discovery", "X-Pairing-Secret", state.secret,
                        &payload, &result);

Serial.printf("SIVA DISCOVERY - HTTP STATUS: %d\n", status);

if (status != 200 && status != 201) {
    message = apiFailureMessage(
        status,
        status == 409 ? "Conferir no painel" : "Aguardando API"
    );
    return false;
}

  if (status != 200 && status != 201) {
    message = apiFailureMessage(status, status == 409 ? "Conferir no painel" : "Aguardando API");
    return false;
  }
  State next = state;
  next.session = result["data"]["sessionId"] | "";
  next.code = result["data"]["code"] | "";
  if (next.session.length() != 36 || next.code.length() != 6 ||
      strspn(next.code.c_str(), "0123456789") != 6) {
    message = "Resposta API invalida";
    return false;
  }
  if (!save(next)) return false;
  message = "Aprovar no painel";
  return true;
}

inline bool pending() {
  JsonDocument body, result;
  body["sessionId"] = state.session;
  int status = apiRequest("/api/devices/pairing/status", "X-Pairing-Secret", state.secret,
                          &body, &result);
  if (status == 401 || status == 404 || status == 410) return save(State{});
  if (status != 200) { message = apiFailureMessage(status, "Aguardando API"); return false; }
  String stage = result["data"]["status"] | "";
  if (stage == "pending") { message = "Aprovar no painel"; return true; }
  if (stage == "expired") { message = "Codigo expirado"; return save(State{}); }
  if (stage == "rejected") {
    message = "Cadastro rejeitado";
    if (!state.code.isEmpty()) {
      State next = state;
      next.code = "";
      if (!save(next)) return false;
    }
    return false;
  }
  if (stage != "approved") { message = "Resposta API invalida"; return false; }

  result.clear();
  status = apiRequest("/api/devices/credentials", "X-Pairing-Secret", state.secret,
                      &body, &result);
  if (status == 410) return save(State{});
  if (status != 200) { message = apiFailureMessage(status, "Retirada pendente"); return false; }
  State next = state;
  next.espId = result["data"]["espId"] | "";
  next.token = result["data"]["token"] | "";
  if (next.token.isEmpty() || next.espId.isEmpty()) {
    message = "Resposta API invalida";
    return false;
  }
  next.secret = "";
  next.code = "";
  // Uma única gravação atômica mantém o token e o identificador para repetir o ACK.
  if (!save(next)) return false;
  message = "Autenticando";
  return true;
}

inline bool checkToken() {
  JsonDocument result;
  int status = apiRequest("/api/devices/me", "X-Token", state.token, nullptr, &result);
  if (status == 401) return forgetRevoked();
  const String espId = result["data"]["espId"] | "";
  if (status != 200 || espId.isEmpty()) {
    message = apiFailureMessage(status == 200 ? ApiInvalid : status, "Aguardando API");
    return false;
  }
  if (espId != state.espId) {
    State next = state;
    next.espId = espId;
    if (!save(next)) return false;
  }
  authenticated = true;
  message = "Conectado";
  return true;
}

inline bool acknowledge() {
  JsonDocument body;
  body["sessionId"] = state.session;
  int status = apiRequest("/api/devices/pairing/ack", "X-Token", state.token, &body);
  if (status == 401) return forgetRevoked();
  if (status == 403 || status == 404 || status == 410) {
    // A sessão pode ter sido removida durante um período offline; reconfira o token.
    if (!checkToken()) return false;
    if (!authenticated) return true;
  } else if (status != 204) {
    message = apiFailureMessage(status, "Confirmacao pendente");
    return false;
  }
  State next = state;
  next.session = "";
  message = "Conectado";
  return save(next);
}

inline void tick() {
  const bool online = WiFi.status() == WL_CONNECTED;
  if (!online || !wasOnline) {
    authenticated = false;
    attemptedRequest = false;
    retryMs = 5000;
  }
  wasOnline = online;
  if (!storageReady && millis() - lastStorageRead >= 30000UL) begin();
  if (!storageReady || !online) return;
  if (!API_HOST[0]) { message = "Configurar host API"; return; }
  if (!API_ROOT_CA[0]) { message = "Configurar CA TLS"; return; }
  if (time(nullptr) < 1704067200) { message = "Aguardando relogio"; return; }
  if (attemptedRequest && millis() - lastRequest < retryMs) return;
  if (authenticated && state.session.isEmpty()) return;
  bool success;
  if (!state.token.isEmpty())
    success = authenticated ? acknowledge() : checkToken();
  else
    success = state.session.isEmpty() ? discover() : pending();
  retryMs = success ? 5000UL : (retryMs >= 30000UL ? 60000UL : retryMs * 2);
  attemptedRequest = true;
  lastRequest = millis();
}

inline void sendReading(float flow) {
  static uint32_t lastFailure = 0;
  static bool retryPending = false;
  static uint32_t waitMs = SEND_INTERVAL_MS;
  if (!authenticated || WiFi.status() != WL_CONNECTED ||
      (retryPending && millis() - lastFailure < waitMs)) return;
  JsonDocument payload;
  payload["esp_id"] = state.espId;
  payload["sensor_id"] = SENSOR_ID;
  payload["vazao"] = flow;
  const int status = apiRequest("/api/readings", "X-Token", state.token, &payload);
  if (status == 401) { forgetRevoked(); attemptedRequest = false; retryPending = false; }
  else if (status >= 200 && status < 300) {
    waitMs = SEND_INTERVAL_MS;
    retryPending = false;
    if (state.session.isEmpty()) message = "Conectado";
  } else {
    message = apiFailureMessage(status, status == 404 ? "Conferir sensor" : "Envio pendente");
    lastFailure = millis();
    retryPending = true;
    waitMs = waitMs >= 30000UL ? 60000UL : waitMs * 2;
  }
}
}  // namespace pairing
