import { NotImplementedError } from '../../../shared/errors/app-error.js';

export const alertService = {
  list(): never {
    throw new NotImplementedError(
      'A detecção de vazamentos/consumo anômalo ainda não foi implementada — ver "Próximas etapas" no README.',
    );
  },
};
