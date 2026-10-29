import type { z } from 'zod';
import type {
  createUserSchema,
  updateUserSchema,
  userStatusSchema,
} from '../validators/user.validators.js';

export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusDTO = z.infer<typeof userStatusSchema>;
