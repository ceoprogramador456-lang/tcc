import { Link } from 'react-router-dom';

import { BrandLogo } from '../components/brand/BrandLogo';
import { buttonStyles } from '../components/ui/button-styles';

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-siva-950 px-4 py-12 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(0,72,124,0.9),transparent_70%)]"
      />

      <main className="relative flex flex-col items-center">
        <Link to="/" aria-label="SIVA — voltar ao início" className="rounded-md">
          <BrandLogo className="h-12 w-auto" />
        </Link>

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-cool-sky">Erro 404</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Página não encontrada</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
          O endereço acessado não existe no SIVA. Volte para a página inicial ou entre no sistema.
        </p>

        <Link to="/" className={`${buttonStyles('primary', 'md')} mt-8`}>
          Voltar à página inicial
        </Link>
      </main>
    </div>
  );
}
