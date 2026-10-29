import { ArrowDownRight, ChartNoAxesCombined, Cpu, Factory, Radio } from 'lucide-react';

const STEPS = [
  { number: '01', icon: <Factory size={24}/>, title: 'A operação', desc: 'Organize os setores, ativos e equipamentos que precisam de acompanhamento.' },
  { number: '02', icon: <Cpu size={24}/>, title: 'A conexão', desc: 'Sensores conectados a dispositivos ESP32 realizam as medições de vazão.' },
  { number: '03', icon: <Radio size={24}/>, title: 'Os dados', desc: 'As leituras são transmitidas à plataforma para consulta e monitoramento.' },
  { number: '04', icon: <ChartNoAxesCombined size={24}/>, title: 'A decisão', desc: 'Painéis e histórico ajudam a equipe a identificar padrões e agir com contexto.' },
];

export function HowItWorksSection() {
  return (
    <section id="tecnologia" className="siva-technology" aria-labelledby="technology-title">
      <div className="siva-container">
        <div className="siva-section-label"><span>03 / TECNOLOGIA</span><span className="siva-line" /></div>
        <div className="siva-technology__top">
          <h2 id="technology-title">Do fluxo físico à<br/><em>inteligência digital.</em></h2>
          <p>Conectamos o que acontece na tubulação com as informações que chegam até quem toma decisões.</p>
        </div>
        <div className="siva-technology__flow" aria-hidden="true">
          <div className="siva-technology__rail"/><span>ÁGUA</span><span className="siva-technology__orb"/><span>DADOS</span><span className="siva-technology__orb"/><span>DECISÃO</span><ArrowDownRight size={19}/>
        </div>
        <div id="como-funciona" className="siva-steps">
          {STEPS.map((step) => (
            <article className="siva-step" key={step.number}>
              <div className="siva-step__top"><span>{step.number}</span><span>{step.icon}</span></div>
              <h3>{step.title}</h3><p>{step.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
