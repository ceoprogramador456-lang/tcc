import { ArrowUpRight, Waves } from 'lucide-react';

/** Encerramento institucional; login permanece apenas no cabeçalho. */
export function RestrictedAccessSection() {
  return (
    <section className="siva-closing" aria-labelledby="closing-title">
      <div className="siva-closing__glow" aria-hidden="true" />
      <div className="siva-container siva-closing__inner">
        <Waves size={39} strokeWidth={1.1} className="siva-closing__waves" aria-hidden="true" />
        <div className="siva-kicker siva-kicker--light"><span className="siva-kicker__dot"/> TECNOLOGIA A SERVIÇO DA ÁGUA</div>
        <h2 id="closing-title">Um novo olhar<br/>para <em>cada gota.</em></h2>
        <p>Conheça como o SIVA transforma medições em uma visão mais inteligente da operação.</p>
        <a href="#inicio" className="siva-btn siva-btn--blue">Voltar ao início <ArrowUpRight size={18} aria-hidden="true" /></a>
      </div>
    </section>
  );
}
