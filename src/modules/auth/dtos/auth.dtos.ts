import type { z } from 'zod';
import type { loginSchema } from '../validators/auth.validators.js';
import type { PublicUser } from '../../users/entities/user.entity.js';

export type LoginDTO = z.infer<typeof loginSchema>;

export interface LoginResult {
  token: string;
  user: PublicUser;
}
