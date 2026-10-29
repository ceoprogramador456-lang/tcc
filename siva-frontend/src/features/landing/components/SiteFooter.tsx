import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { BrandLogo } from '../../../components/brand/BrandLogo';
const currentYear = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="siva-footer">
      <div className="siva-container siva-footer__grid">
        <div className="siva-footer__brand">
          <a href="#inicio" aria-label="SIVA — voltar ao início">
            <BrandLogo className="siva-footer__logo" loading="lazy" />
          </a>
          <p>
            Sistema Inteligente de Vazão de Água.
            <br />
            Tecnologia para monitoramento industrial.
          </p>
        </div>
        <div className="siva-footer__links">
          <span>EXPLORAR</span>
          <a href="#visao">Visão</a>
          <a href="#solucao">Solução</a>
          <a href="#tecnologia">Tecnologia</a>
        </div>
        <div className="siva-footer__links">
          <span>PLATAFORMA</span>
          <Link to="/login">
            Área do cliente <ArrowUpRight size={13} />
          </Link>
          <a href="#como-funciona">Como funciona</a>
        </div>
      </div>
      <div className="siva-container siva-footer__bottom">
        <span>© {currentYear} SIVA. Todos os direitos reservados.</span>
        <span>DESENVOLVIDO PARA TRANSFORMAR DADOS EM DECISÕES.</span>
      </div>
    </footer>
  );
}
