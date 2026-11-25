import { z } from 'zod';

export const createOrdemServicoSchema = z.object({
  nome: z.string().min(2).max(100),
  tipo: z.enum(['preventiva', 'corretiva', 'inspecao']),
  descricao: z.string().max(2000).optional().nullable(),
});

export const aceitarOrdemServicoSchema = z.object({
  funcionarioId: z.coerce.number().int().positive(),
});

export const alterarFuncionarioOrdemServicoSchema = z.object({
  funcionarioId: z.coerce.number().int().positive(),
});

export const ordemServicoIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listOrdensServicoQuerySchema = z.object({
  status: z.enum(['aberto', 'em_andamento', 'concluido']).optional(),
  empresaId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
