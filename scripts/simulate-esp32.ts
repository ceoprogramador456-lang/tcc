/**
 * Simula um ESP32 enviando leituras de vazão para a API, no mesmo formato
 * documentado no README (payload do firmware).
 *
 * Uso:
 *   npm run simulate:esp32
 *   BASE_URL=http://localhost:3000 ESP_TOKEN=dev-token-esp01 ESP_ID=esp_01 SENSOR_ID=sensor_01 npm run simulate:esp32
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const ESP_TOKEN = process.env.ESP_TOKEN ?? 'dev-token-esp01';
const ESP_ID = process.env.ESP_ID ?? 'esp_01';
const SENSOR_ID = process.env.SENSOR_ID ?? 'sensor_01';
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 5000);

async function sendReading(): Promise<void> {
  const vazao = Number((10 + Math.random() * 4).toFixed(2));

  const response = await fetch(`${BASE_URL}/api/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Token': ESP_TOKEN },
    body: JSON.stringify({ esp_id: ESP_ID, setor: 'producao', sensor_id: SENSOR_ID, vazao }),
  });

  const body = await response.json().catch(() => null);
  const timestamp = new Date().toISOString();

  if (!response.ok) {
    console.error(`[${timestamp}] falha (${response.status}):`, body);
    return;
  }
  console.log(`[${timestamp}] leitura enviada: vazao=${vazao} L/min`);
}

console.log(`Simulando ESP32 "${ESP_ID}" -> ${BASE_URL}/api/readings a cada ${INTERVAL_MS}ms`);
void sendReading();
setInterval(() => void sendReading(), INTERVAL_MS);
