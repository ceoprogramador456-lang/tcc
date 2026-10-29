import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { LoadingBlock } from './components/ui/LoadingBlock';
import { RequireAdmin } from './features/admin/guards/RequireAdmin';
import { AdminLayout } from './features/admin/layout/AdminLayout';
import { RequireAuthenticated } from './features/panel/guards/RequireAuthenticated';
import { PanelLayout } from './features/panel/layout/PanelLayout';
import { RequireCompanyManager } from './features/panel/guards/RequireCompanyManager';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * Áreas carregadas sob demanda: as telas públicas (landing e login) não
 * precisam pagar o custo das tabelas administrativas nem das animações.
 */
const AdminDashboardPage = lazy(() =>
  import('./features/admin/dashboard/AdminDashboardPage').then((m) => ({
    default: m.default,
  })),
);
const CompaniesPage = lazy(() =>
  import('./features/admin/companies/CompaniesPage').then((m) => ({ default: m.default })),
);
const CompanyDetailPage = lazy(() =>
  import('./features/admin/companies/CompanyDetailPage').then((m) => ({ default: m.default })),
);
const UsersPage = lazy(() =>
  import('./features/admin/users/UsersPage').then((m) => ({ default: m.default })),
);
const CompanyUsersPage = lazy(() => import('./features/panel/users/CompanyUsersPage'));

const PanelDashboardPage = lazy(() =>
  import('./features/panel/dashboard/PanelDashboardPage').then((m) => ({ default: m.default })),
);
const SectorsPage = lazy(() =>
  import('./features/panel/sectors/SectorsPage').then((m) => ({ default: m.default })),
);
const AssetsPage = lazy(() =>
  import('./features/panel/assets/AssetsPage').then((m) => ({ default: m.default })),
);
const DevicesPage = lazy(() =>
  import('./features/panel/devices/DevicesPage').then((m) => ({ default: m.default })),
);
const PanelSensorsPage = lazy(() =>
  import('./features/panel/sensors/SensorsPage').then((m) => ({ default: m.default })),
);

function Fallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingBlock label="Carregando…" minHeight="12rem" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Área administrativa — perfil ADMIN. */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<Fallback />}>
              <AdminDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="empresas"
          element={
            <Suspense fallback={<Fallback />}>
              <CompaniesPage />
            </Suspense>
          }
        />
        <Route
          path="empresas/:id"
          element={
            <Suspense fallback={<Fallback />}>
              <CompanyDetailPage />
            </Suspense>
          }
        />
        <Route
          path="usuarios"
          element={
            <Suspense fallback={<Fallback />}>
              <UsersPage />
            </Suspense>
          }
        />
      </Route>

      {/* Área operacional — qualquer usuário autenticado. */}
      <Route
        path="/painel"
        element={
          <RequireAuthenticated>
            <PanelLayout />
          </RequireAuthenticated>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<Fallback />}>
              <PanelDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="setores"
          element={
            <Suspense fallback={<Fallback />}>
              <SectorsPage />
            </Suspense>
          }
        />
        <Route
          path="usuarios"
          element={
            <RequireCompanyManager>
              <Suspense fallback={<Fallback />}>
                <CompanyUsersPage />
              </Suspense>
            </RequireCompanyManager>
          }
        />
        <Route
          path="ativos"
          element={
            <Suspense fallback={<Fallback />}>
              <AssetsPage />
            </Suspense>
          }
        />
        <Route
          path="esp32"
          element={
            <Suspense fallback={<Fallback />}>
              <DevicesPage />
            </Suspense>
          }
        />
        <Route
          path="sensores"
          element={
            <Suspense fallback={<Fallback />}>
              <PanelSensorsPage />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
