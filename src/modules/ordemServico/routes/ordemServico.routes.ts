import { Router } from 'express';
import { authenticateUser, authorize } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { ordemServicoController } from '../controllers/ordemServico.controller.js';
import {
  aceitarOrdemServicoSchema,
  alterarFuncionarioOrdemServicoSchema,
  createOrdemServicoSchema,
  listOrdensServicoQuerySchema,
  ordemServicoIdParamSchema,
} from '../validators/ordemServico.validators.js';

export const ordemServicoRoutes = Router();

ordemServicoRoutes.use(authenticateUser);

ordemServicoRoutes.get(
  '/',
  authorize('ADMIN', 'GESTOR', 'TECNICO'),
  validate({ query: listOrdensServicoQuerySchema }),
  ordemServicoController.list,
);

// A criação é do GESTOR da empresa cliente; o ADMIN não cria OS para a SIVA.
ordemServicoRoutes.post(
  '/',
  authorize('GESTOR'),
  validate({ body: createOrdemServicoSchema }),
  ordemServicoController.create,
);

ordemServicoRoutes.post(
  '/:id/aceitar',
  validate({ params: ordemServicoIdParamSchema, body: aceitarOrdemServicoSchema }),
  authorize('ADMIN'),
  ordemServicoController.accept,
);

ordemServicoRoutes.post(
  '/:id/concluir',
  validate({ params: ordemServicoIdParamSchema }),
  authorize('ADMIN'),
  ordemServicoController.complete,
);

ordemServicoRoutes.get(
  '/:id',
  authorize('ADMIN', 'TECNICO'),
  validate({ params: ordemServicoIdParamSchema }),
  ordemServicoController.getById,
);

ordemServicoRoutes.patch(
  '/:id',
  validate({ params: ordemServicoIdParamSchema, body: alterarFuncionarioOrdemServicoSchema }),
  authorize('ADMIN'),
  ordemServicoController.alterarFuncionario,
);
