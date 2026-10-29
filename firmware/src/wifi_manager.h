#pragma once

#include <WiFi.h>
#include <WiFiManager.h>

#include "config.h"
#include "display.h"

// Conecta usando a credencial gravada na NVS do ESP32. Se não houver nenhuma —
// ou se a rede salva não responder — sobe um access point (WIFI_PORTAL_SSID)
// com portal cativo: o usuário conecta pelo celular, escolhe a rede numa lista
// e digita a senha uma vez. A credencial nunca passa pelo repositório.
//
// Retorna false quando o portal expira sem configuração. O firmware segue
// rodando offline de propósito: o sensor continua contando pulsos e a vazão
// aparece no serial e no display, só o envio para a API fica suspenso.
inline bool connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);

  WiFiManager wm;
  wm.setConnectTimeout(WIFI_CONNECT_TIMEOUT_S);
  wm.setConfigPortalTimeout(WIFI_PORTAL_TIMEOUT_S);

  wm.setAPCallback([](WiFiManager* portal) {
    Serial.printf(
        "\nNenhuma rede configurada.\n"
        "  1. No celular, conecte no Wi-Fi \"%s\" (senha: %s)\n"
        "  2. Abra http://%s\n"
        "  3. Escolha a sua rede e informe a senha\n"
        "Portal expira em %d segundos.\n",
        WIFI_PORTAL_SSID, WIFI_PORTAL_PASSWORD,
        WiFi.softAPIP().toString().c_str(), WIFI_PORTAL_TIMEOUT_S);
    showMessage("SIVA - configure o WiFi", "Rede: " WIFI_PORTAL_SSID,
                "Senha: " WIFI_PORTAL_PASSWORD);
  });

  Serial.println("Procurando rede Wi-Fi salva...");
  bool connected = wm.autoConnect(WIFI_PORTAL_SSID, WIFI_PORTAL_PASSWORD);

  if (connected) {
    Serial.printf("Wi-Fi conectado a \"%s\", IP: %s\n", WiFi.SSID().c_str(),
                  WiFi.localIP().toString().c_str());
  } else {
    Serial.println(
        "Portal expirou sem configuracao. Seguindo offline: as leituras "
        "aparecem aqui e no display, mas nao sao enviadas para a API.");
  }
  return connected;
}
