import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';

import { BrandLogo } from '../../../components/brand/BrandLogo';

const LINKS = [
  { href: '#visao', title: 'Visão' },
  { href: '#solucao', title: 'Solução' },
  { href: '#tecnologia', title: 'Tecnologia' },
  { href: '#como-funciona', title: 'Como funciona' },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="siva-header">
      <div className="siva-header__inner siva-container">
        <a href="#inicio" className="siva-header__brand" aria-label="SIVA — início" onClick={() => setMenuOpen(false)}>
          <BrandLogo className="siva-header__logo" />
          <span className="siva-header__brand-dot" aria-hidden="true" />
        </a>
        <nav aria-label="Navegação principal" className={`siva-header__nav ${menuOpen ? 'is-open' : ''}`}>
          {LINKS.map(({ href, title }) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>{title}</a>
          ))}
          <Link className="siva-header__client--mobile" to="/login" onClick={() => setMenuOpen(false)}>
            Área do cliente <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </nav>
        <Link to="/login" className="siva-header__client">
          Área do cliente <ArrowUpRight size={15} strokeWidth={1.7} aria-hidden="true" />
        </Link>
        <button
          className="siva-header__menu"
          type="button"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
    </header>
  );
}
