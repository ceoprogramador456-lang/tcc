import { createHash, randomBytes } from 'node:crypto';

/**
 * Gera o token de autenticação de um dispositivo ESP32.
 *
 * 24 bytes aleatórios criptográficos → 32 caracteres base64url (~192 bits de
 * entropia). O prefixo `dev-` é mantido para identificação em logs de suporte.
 */
export function generateDeviceToken(): string {
  return `dev-${randomBytes(24).toString('base64url')}`;
}

/**
 * Hash SHA-256 (hexadecimal) do token.
 *
 * É o que fica persistido: o banco nunca guarda o token em texto plano, e o
 * firmware continua usando o token em claro no header `X-Token`.
 */
export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
