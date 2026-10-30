import { useState } from 'react';
import { AlertMessage } from '../../../../components/ui/AlertMessage';
import { Button } from '../../../../components/ui/Button';
import { InputField, SelectField } from '../../../../components/ui/FormField';
import { Modal } from '../../../../components/ui/Modal';
import { useAsyncData } from '../../../../hooks/use-async-data';
import { catalogService } from '../../../../services/catalog/catalog.service';
import { pairingService } from '../../../../services/devices/pairing.service';
import type { PairingPreview } from '../../../../services/devices/pairing.service';

interface Props {
  token: string;
  empresaId: number | null;
  onClose: () => void;
  onPaired: () => void;
}
export function PairDeviceDialog({ token, empresaId, onClose, onPaired }: Props) {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<PairingPreview | null>(null);
  const [ativoId, setAtivoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: assets, error: assetsError } = useAsyncData(
    () => catalogService.assets(token, { empresaId }),
    `${token}:${empresaId}`,
  );

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (!preview) {
        setPreview(await pairingService.lookup(token, code));
      } else {
        if (!ativoId) {
          setError('Selecione o equipamento que será monitorado.');
          return;
        }
        await pairingService.approve(token, { code, ativoId: Number(ativoId), descricao });
        onPaired();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível parear a placa.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Conectar ESP32"
      description="Ligue a placa já configurada por USB e confira o código no OLED."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={busy || (preview !== null && !ativoId)}>
            {busy ? 'Aguarde…' : preview ? 'Aprovar e conectar' : 'Localizar placa'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error || assetsError ? (
          <AlertMessage tone="danger">{error ?? assetsError}</AlertMessage>
        ) : null}
        <InputField
          name="pairingCode"
          label="Código do OLED"
          placeholder="AB12-CD34"
          value={code}
          onChange={(value) => {
            setCode(value.toUpperCase());
            setPreview(null);
          }}
          disabled={busy}
          required
        />
        {preview ? (
          <>
            <div className="rounded-lg bg-sky-50 p-4 text-sm text-sky-950">
              <p className="font-semibold">Placa encontrada</p>
              <p>
                MAC: <span className="font-mono">{preview.macAddress}</span>
              </p>
              <p>O código expira às {new Date(preview.expiresAt).toLocaleTimeString('pt-BR')}.</p>
              {preview.existingDeviceId ? (
                <p>Selecione o equipamento já vinculado para preservar as leituras.</p>
              ) : null}
            </div>
            <SelectField
              name="pairingAsset"
              label="Equipamento monitorado"
              value={ativoId}
              onChange={setAtivoId}
              placeholder="Selecione o equipamento"
              required
              disabled={busy}
              options={(assets?.items ?? []).map((asset) => ({
                value: String(asset.id),
                label: `${asset.nome}${asset.tag ? ` · ${asset.tag}` : ''}`,
              }))}
            />
            {assets && assets.items.length === 0 ? (
              <AlertMessage tone="warning">
                Cadastre um setor e um equipamento antes de aprovar a placa.
              </AlertMessage>
            ) : null}
            <InputField
              name="pairingDescription"
              label="Nome ou descrição da placa"
              value={descricao}
              onChange={setDescricao}
              placeholder="ESP32 da casa de bombas"
              disabled={busy}
            />
            <p className="text-sm text-slate-600">
              O setor será definido pelo equipamento selecionado. O sensor será vinculado e a placa
              receberá sua credencial automaticamente.
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            O código confirma qual placa você está conectando. Ele fica disponível por 10 minutos.
          </p>
        )}
      </div>
    </Modal>
  );
}
