import { z } from 'zod';

export const tipoUsuarioSchema = z.enum(['ADMIN', 'GESTOR', 'TECNICO']);
export const especialidadeSchema = z.enum(['MECANICO', 'ELETRICISTA']);
export const statusUsuarioSchema = z.enum(['ATIVO', 'INATIVO']);

export const createUserSchema = z
  .object({
    nome: z.string().min(2).max(100),
    email: z.string().email().max(100),
    senha: z.string().min(6).max(72),
    tipo: tipoUsuarioSchema,
    empresaId: z.coerce.number().int().positive().optional().nullable(),
    especialidade: especialidadeSchema.optional().nullable(),
    status: statusUsuarioSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === 'ADMIN') {
      if (data.empresaId !== undefined && data.empresaId !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['empresaId'],
          message: 'ADMIN não deve possuir empresaId.',
        });
      }
      if (data.especialidade !== undefined && data.especialidade !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['especialidade'],
          message: 'ADMIN não deve possuir especialidade.',
        });
      }
    }
    if (data.tipo === 'GESTOR') {
      if (data.empresaId === undefined || data.empresaId === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['empresaId'],
          message: 'empresaId é obrigatório para GESTOR.',
        });
      }
      if (data.especialidade !== undefined && data.especialidade !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['especialidade'],
          message: 'GESTOR não deve possuir especialidade.',
        });
      }
    }
    if (data.tipo === 'TECNICO') {
      if (data.empresaId === undefined || data.empresaId === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['empresaId'],
          message: 'empresaId é obrigatório para TECNICO.',
        });
      }
      if (data.especialidade === undefined || data.especialidade === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['especialidade'],
          message: 'especialidade é obrigatória para TECNICO (MECANICO ou ELETRICISTA).',
        });
      }
    }
  });

export const updateUserSchema = z
  .object({
    nome: z.string().min(2).max(100).optional(),
    email: z.string().email().max(100).optional(),
    senha: z.string().min(6).max(72).optional(),
    tipo: tipoUsuarioSchema.optional(),
    empresaId: z.coerce.number().int().positive().optional().nullable(),
    especialidade: especialidadeSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Valida a combinação apenas quando tipo + correlatos são enviados juntos.
    // A validação completa da combinação final acontece no service.
    if (data.tipo === 'ADMIN') {
      if (data.empresaId !== undefined && data.empresaId !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['empresaId'],
          message: 'ADMIN não deve possuir empresaId.',
        });
      }
      if (data.especialidade !== undefined && data.especialidade !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['especialidade'],
          message: 'ADMIN não deve possuir especialidade.',
        });
      }
    }
    if (data.tipo === 'GESTOR' && data.especialidade !== undefined && data.especialidade !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['especialidade'],
        message: 'GESTOR não deve possuir especialidade.',
      });
    }
  });

export const userStatusSchema = z.object({
  status: statusUsuarioSchema,
});

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listUsersQuerySchema = z.object({
  empresaId: z.coerce.number().int().positive().optional(),
  tipo: tipoUsuarioSchema.optional(),
  status: statusUsuarioSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
