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
  validate({ query: listOrdensServicoQuerySchema }),
  ordemServicoController.list,
);

ordemServicoRoutes.post(
  '/',
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
  validate({ params: ordemServicoIdParamSchema }),
  authorize('ADMIN'),
  ordemServicoController.getById,
);

ordemServicoRoutes.patch(
  '/:id',
  validate({ params: ordemServicoIdParamSchema, body: alterarFuncionarioOrdemServicoSchema }),
  authorize('ADMIN'),
  ordemServicoController.alterarFuncionario,
);
