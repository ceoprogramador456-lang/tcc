import { Activity, Cpu, LayoutDashboard, Radio, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PanelNavItem {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  end?: boolean;
}

/** Navegação da área operacional (disponível para qualquer usuário autenticado). */
export const PANEL_NAV_ITEMS: PanelNavItem[] = [
  {
    to: '/painel',
    label: 'Visão geral',
    description: 'Consumo, sensores e atividades',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/painel/setores',
    label: 'Setores',
    description: 'Áreas onde o consumo de água é monitorado',
    icon: Warehouse,
  },
  {
    to: '/painel/ativos',
    label: 'Equipamentos',
    description: 'Máquinas e pontos monitorados',
    icon: Cpu,
  },
  {
    to: '/painel/esp32',
    label: 'Dispositivos',
    description: 'Aparelhos que enviam as leituras',
    icon: Radio,
  },
  {
    to: '/painel/sensores',
    label: 'Sensores',
    description: 'Pontos que medem a vazão de água nos equipamentos',
    icon: Activity,
  },
];
