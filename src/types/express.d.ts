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
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
    device?: AuthenticatedDevice;
    log: Logger;
  }
}
