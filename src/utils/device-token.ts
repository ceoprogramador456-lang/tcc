import { createHash } from 'node:crypto';

/**
 * Hash SHA-256 (hexadecimal) do token.
 *
 * É o que fica persistido: o banco nunca guarda o token em texto plano, e o
 * firmware continua usando o token em claro no header `X-Token`.
 */
export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
