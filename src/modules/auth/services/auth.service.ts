import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../../../shared/errors/app-error.js';
import { createUserRepository } from '../../users/repositories/user.repository.js';
import { toPublicUser } from '../../users/entities/user.entity.js';
import type { AuthenticatedUser } from '../../../types/express.js';
import type { LoginDTO, LoginResult } from '../dtos/auth.dtos.js';

const userRepository = createUserRepository();

export const authService = {
  async login(data: LoginDTO): Promise<LoginResult> {
    const user = await userRepository.findByEmail(data.email);
    if (!user) throw new UnauthorizedError('E-mail ou senha inválidos.');

    const senhaValida = await bcrypt.compare(data.senha, user.senha);
    if (!senhaValida) throw new UnauthorizedError('E-mail ou senha inválidos.');

    if (user.status === 'INATIVO') {
      throw new ForbiddenError('Usuário inativo. Entre em contato com o administrador.');
    }

    const payload: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      tipo: user.tipo,
      empresaId: user.empresaId,
    };
    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    return { token, user: toPublicUser(user) };
  },

  async me(actor: AuthenticatedUser) {
    const user = await userRepository.findById(actor.id);
    if (!user) throw new UnauthorizedError();
    if (user.status === 'INATIVO') {
      throw new ForbiddenError('Usuário inativo. Entre em contato com o administrador.');
    }
    return toPublicUser(user);
  },
};
