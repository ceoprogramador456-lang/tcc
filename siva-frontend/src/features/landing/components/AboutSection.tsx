import { ArrowUpRight } from 'lucide-react';

export function AboutSection() {
  return (
    <section id="visao" className="siva-vision" aria-labelledby="vision-title">
      <div className="siva-container siva-vision__inner">
        <div className="siva-section-label"><span>01 / NOSSA VISÃO</span><span className="siva-line" /></div>
        <div className="siva-vision__columns">
          <h2 id="vision-title">O que não se vê, <span>pode transformar tudo.</span></h2>
          <div className="siva-vision__right">
            <span className="siva-vision__mark" aria-hidden="true">“</span>
            <p>Por trás de cada litro existe uma informação. O SIVA aproxima o mundo físico do digital para tornar o consumo de água na indústria mais visível, compreensível e gerenciável.</p>
            <a href="#tecnologia">Conheça nossa tecnologia <ArrowUpRight size={17} aria-hidden="true" /></a>
          </div>
        </div>
        <div className="siva-vision__divider" />
        <div className="siva-vision__micro">
          <span>SIVA / SISTEMA INTELIGENTE DE VAZÃO DE ÁGUA</span>
          <span>DA MEDIÇÃO À DECISÃO.</span>
        </div>
      </div>
    </section>
  );
}
