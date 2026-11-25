import type { z } from 'zod';
import type {
  aceitarOrdemServicoSchema,
  alterarFuncionarioOrdemServicoSchema,
  createOrdemServicoSchema,
} from '../validators/ordemServico.validators.js';
import type { OrdemServico } from '../entities/ordemServico.entity.js';

export type CreateOrdemServicoDTO = z.infer<typeof createOrdemServicoSchema>;

export type AceitarOrdemServicoDTO = z.infer<typeof aceitarOrdemServicoSchema>;

export type AlterarFuncionarioOrdemServicoDTO = z.infer<
  typeof alterarFuncionarioOrdemServicoSchema
>;

/** Entrada completa de criação no repositório (PK excluída). */
export type OrdemServicoCreationInput = Omit<OrdemServico, 'id'>;

/** Campos mutáveis pela transição de status (aceito / concluído). */
export type UpdateOrdemServicoDTO = Partial<
  Pick<OrdemServico, 'status' | 'funcionarioId' | 'aceitoPor' | 'aceitoEm' | 'concluidoEm'>
>;
