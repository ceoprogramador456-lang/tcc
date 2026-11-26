import 'express';
import type { Logger } from 'pino';

export type UserRole = 'ADMIN' | 'GESTOR' | 'TECNICO';
export type Especialidade = 'MECANICO' | 'ELETRICISTA';
export type StatusUsuario = 'ATIVO' | 'INATIVO';

export interface AuthenticatedUser {
  id: number;
  email: string;
  tipo: UserRole;
  empresaId: number | null;
}

export interface AuthenticatedDevice {
  id: number;
  espId: string;
  setorId: number;
  tokenHash: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
    userSessionExpiresAt?: number;
    device?: AuthenticatedDevice;
    log: Logger;
  }
}
