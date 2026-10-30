import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';

test('pareia pelo OLED no painel e mostra a primeira leitura sem expor o token', async ({
  page,
  request,
}) => {
  const secret = randomBytes(32).toString('hex');
  const macAddress = `02:${randomBytes(5).toString('hex').match(/../g)!.join(':')}`.toUpperCase();
  const base = 'http://127.0.0.1:3000/api';
  const start = await request.post(`${base}/device-pairings/request`, {
    headers: { 'X-Pairing-Key': secret },
    data: { macAddress, sensorId: 'flow_01' },
  });
  expect(start.status()).toBe(201);
  const { code } = (await start.json()).data;
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill('carla.mendes@aquaplas.com');
  await page.getByLabel('Senha', { exact: true }).fill('senha123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/painel/);
  await page.goto('/painel/esp32');
  await page.getByRole('button', { name: 'Conectar ESP32' }).click();
  await page.getByLabel('Código do OLED').fill(code);
  await page.getByRole('button', { name: 'Localizar placa' }).click();
  await expect(page.getByText('Placa encontrada')).toBeVisible();
  await expect(page.getByText(macAddress, { exact: true })).toBeVisible();
  await page.getByLabel('Equipamento monitorado').selectOption('1');
  await page.getByLabel('Nome ou descrição da placa').fill('ESP32 teste completo');
  const approvedResponse = page.waitForResponse(
    (res) => res.url().endsWith('/device-pairings/approve') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Aprovar e conectar' }).click();
  const approved = await (await approvedResponse).json();
  expect(approved.data.device.token).toBeUndefined();
  await expect(page.getByText(/Pareamento aprovado/)).toBeVisible();
  const poll = await request.post(`${base}/device-pairings/status`, {
    headers: { 'X-Pairing-Key': secret },
    data: { macAddress },
  });
  const { token, espId, sensorId } = (await poll.json()).data;
  const reading = await request.post(`${base}/readings`, {
    headers: { 'X-Token': token },
    data: { esp_id: espId, sensor_id: sensorId, vazao: 8.25 },
  });
  expect(reading.status()).toBe(201);
  await request.post(`${base}/device-pairings/acknowledge`, {
    headers: { 'X-Pairing-Key': secret },
    data: { macAddress },
  });
  const row = page.getByRole('row').filter({ hasText: espId });
  await expect(row.getByText('Online', { exact: true })).toBeVisible({ timeout: 12000 });
  await expect(page.getByText(token, { exact: true })).toHaveCount(0);
  // Reopening the panel restores the user session; the device keeps using its saved token.
  await page.reload();
  await expect(row.getByText('Online', { exact: true })).toBeVisible();
  await page.goto('/painel');
  await expect(page.getByText('Vazão atual', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Leitura de vazão registrada', { exact: true }).first(),
  ).toBeVisible();
});
