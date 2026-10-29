import { useState } from 'react';
import { Check, Copy, KeyRound, TriangleAlert } from 'lucide-react';

import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';

interface DeviceTokenDialogProps {
  open: boolean;
  /** Token em claro — disponível somente na resposta de criação. */
  token: string | null;
  espId: string | null;
  onClose: () => void;
}

/**
 * Exibição do token de acesso do ESP32.
 *
 * O servidor entrega o token **uma única vez**, na resposta de criação. Esta
 * tela é o único ponto onde ele aparece — o valor não é enviado a nenhum
 * outro lugar e some do estado ao fechar.
 */
export function DeviceTokenDialog({ open, token, espId, onClose }: DeviceTokenDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Área de transferência indisponível (contexto inseguro) — o usuário
      // pode selecionar e copiar manualmente.
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Token de acesso do dispositivo"
      description={`Configure o firmware ${espId ?? ''} com o token abaixo.`}
      size="sm"
      footer={<Button onClick={onClose}>Entendi, já copiei</Button>}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">
            Este token é exibido <strong>uma única vez</strong>. O servidor guarda apenas o hash
            SHA-256 dele — se for perdido, é preciso recriar o dispositivo.
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Token (header X-Token)</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-900">
              {token ?? '—'}
            </code>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCopy()}
              disabled={!token}
              aria-label="Copiar token"
            >
              {copied ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="size-4" aria-hidden="true" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p className="flex items-center gap-1.5 font-semibold text-slate-700">
            <KeyRound className="size-3.5" aria-hidden="true" />
            Como configurar
          </p>
          <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed">
            {`curl -X POST ${'{API}'}/api/readings \\
  -H "X-Token: ${token ?? '<token>'}" \\
  -H "Content-Type: application/json" \\
  -d '{ "esp_id": "${espId ?? 'esp_01'}", "sensor_id": "sensor_01", "vazao": 12.5 }'`}
          </pre>
        </div>
      </div>
    </Modal>
  );
}
