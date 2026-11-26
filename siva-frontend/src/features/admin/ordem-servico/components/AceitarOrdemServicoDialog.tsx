import { useState } from 'react';

import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { FuncionariosSelect } from './FuncionariosSelect';

interface AceitarOrdemServicoDialogProps {
  ordemId: number;
  open: boolean;
  onClose: () => void;
  onAceitar: (ordemId: number, funcionarioId: number) => Promise<void>;
}

/** Modal "Aceitar": pede o funcionário responsável (ADMIN). */
export function AceitarOrdemServicoDialog({
  ordemId,
  open,
  onClose,
  onAceitar,
}: AceitarOrdemServicoDialogProps) {
  const [funcionarioId, setFuncionarioId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (!funcionarioId) {
      setError('Selecione o funcionário responsável.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onAceitar(ordemId, Number(funcionarioId));
      onClose();
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível aceitar a solicitação. Tente novamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      key={ordemId}
      title="Aceitar solicitação de serviço"
      description="Defina quem vai executar o serviço."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? 'Aceitando…' : 'Aceitar'}
          </Button>
        </>
      }
    >
      <FuncionariosSelect
        label="Funcionário responsável"
        required
        value={funcionarioId}
        onChange={setFuncionarioId}
        error={error ?? undefined}
        disabled={isSubmitting}
        placeholder="Selecione o funcionário"
      />
    </Modal>
  );
}
