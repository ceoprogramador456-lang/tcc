import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { Activity, Cpu, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { EmptyState } from '../../../../components/ui/EmptyState';
import type { DashboardAtividade } from '../../../../types/dashboard';
import { formatDateTime } from '../../../../utils/format';

const ICONES: Record<DashboardAtividade['tipo'], LucideIcon> = {
  leitura: Activity,
  manutencao: Wrench,
  dispositivo: Cpu,
};

const TONES: Record<DashboardAtividade['tipo'], string> = {
  leitura: 'bg-siva-50 text-bright-teal-blue',
  manutencao: 'bg-amber-50 text-amber-600',
  dispositivo: 'bg-slate-100 text-slate-500',
};

interface ActivityFeedProps {
  atividades: DashboardAtividade[];
}

/**
 * Feed de atividades (equivalente ao Animated List do React Bits).
 *
 * Os itens entram com fade + deslocamento curto. A animação é suprimida quando
 * o usuário prefere menos movimento.
 */
export function ActivityFeed({ atividades }: ActivityFeedProps) {
  const prefersReducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? atividades : atividades.slice(0, 5);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-display text-base font-bold text-slate-900">Atividades recentes</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Eventos registrados pela plataforma: leituras, manutenções e dispositivos ativos.
        </p>
      </header>

      {atividades.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nenhuma atividade registrada"
          description="As leituras e manutenções aparecerão aqui assim que forem registradas."
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          <AnimatePresence initial={false}>
            {visible.map((atividade) => {
              const Icon = ICONES[atividade.tipo];

              return (
                <motion.li
                  key={atividade.id}
                  layout={!prefersReducedMotion}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="flex items-start gap-3 px-5 py-3.5"
                >
                  <span
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${TONES[atividade.tipo]}`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {atividade.titulo}
                    </p>
                    <p className="truncate text-xs text-slate-500">{atividade.descricao}</p>
                  </div>

                  <time dateTime={atividade.occurredAt} className="shrink-0 text-xs text-slate-400">
                    {formatDateTime(atividade.occurredAt)}
                  </time>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
      {atividades.length > 5 ? (
        <div className="border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="rounded text-sm font-semibold text-sky-700 hover:text-sky-900"
          >
            {expanded
              ? 'Mostrar apenas as 5 mais recentes'
              : `Ver mais atividades (${atividades.length})`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
