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
    // Todo usuário pertence a uma empresa: ADMIN/TECNICO à SIVA e GESTOR a
    // uma empresa cliente. O tipo da empresa é validado no service (depende do
    // banco); aqui garantimos apenas a presença e a especialidade.
    if (data.empresaId === undefined || data.empresaId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['empresaId'],
        message: 'empresaId é obrigatório.',
      });
    }

    if (data.tipo === 'TECNICO') {
      if (data.especialidade === undefined || data.especialidade === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['especialidade'],
          message: 'TECNICO deve possuir especialidade (MECANICO ou ELETRICISTA).',
        });
      }
    } else if (data.especialidade !== undefined && data.especialidade !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['especialidade'],
        message: `${data.tipo} não deve possuir especialidade.`,
      });
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
    // Valida apenas o que foi enviado; a combinação final (tipo + empresa +
    // especialidade) é conferida no service, que conhece o tipo da empresa.
    if (data.empresaId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['empresaId'],
        message: 'empresaId é obrigatório.',
      });
    }

    if (data.tipo === 'TECNICO' && data.especialidade === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['especialidade'],
        message: 'TECNICO deve possuir especialidade (MECANICO ou ELETRICISTA).',
      });
    }
    if (
      data.tipo !== undefined &&
      data.tipo !== 'TECNICO' &&
      data.especialidade !== undefined &&
      data.especialidade !== null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['especialidade'],
        message: `${data.tipo} não deve possuir especialidade.`,
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
