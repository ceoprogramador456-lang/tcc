import { httpClient } from '../api/http-client';
import type { AdminSummary } from '../../types/dashboard';
import type { DashboardOverview } from '../../types/dashboard';

/**
 * Endpoints de dashboard.
 *
 *  - `GET /api/dashboard/admin-summary` → contadores globais (somente ADMIN);
 *  - `GET /api/dashboard/overview`       → painel operacional, já escopado pela
 *    empresa do usuário (ADMIN pode filtrar por `?empresaId=`).
 */
export const dashboardService = {
  adminSummary(token: string): Promise<AdminSummary> {
    return httpClient.get<AdminSummary>('/dashboard/admin-summary', { token });
  },

  overview(token: string, empresaId?: number | null): Promise<DashboardOverview> {
    return httpClient.get<DashboardOverview>('/dashboard/overview', {
      token,
      query: { empresaId: empresaId ?? undefined },
    });
  },
};
