import { Activity, ArrowUpRight, ChartNoAxesCombined, Droplets, ShieldCheck, Wrench } from 'lucide-react';

const POINTS = [31, 38, 34, 43, 42, 53, 45, 50, 57, 48, 66, 59, 64, 56, 74, 70, 77, 67, 81, 75];
const polyline = POINTS.map((n, i) => `${(i / (POINTS.length - 1)) * 100},${100 - n}`).join(' ');

export function FeaturesSection() {
  return (
    <section id="solucao" className="siva-solution" aria-labelledby="solution-title">
      <div className="siva-container">
        <div className="siva-section-label siva-section-label--light"><span>02 / A SOLUÇÃO</span><span className="siva-line" /></div>
        <div className="siva-solution__head">
          <div>
            <div className="siva-kicker"><span className="siva-kicker__dot"/> MONITORAMENTO INTELIGENTE</div>
            <h2 id="solution-title">Dados que fluem.<br /><em>Decisões que avançam.</em></h2>
          </div>
          <p>Do sensor conectado à leitura do gestor. Uma visão centralizada para acompanhar o que acontece com a água em sua operação.</p>
        </div>
        <div className="siva-solution__layout">
          <div className="siva-dashboard" aria-label="Prévia visual ilustrativa da interface de monitoramento SIVA">
            <div className="siva-dashboard__top">
              <div className="siva-dashboard__identity"><span className="siva-dashboard__symbol">S<span>.</span></span><span>VISÃO OPERACIONAL <small>PAINEL SIVA / CONCEITO VISUAL</small></span></div>
              <span className="siva-dashboard__indicator"><span /> VISUALIZAÇÃO</span>
            </div>
            <div className="siva-dashboard__body">
              <div className="siva-dashboard__title">
                <div><small>VISÃO GERAL</small><h3>Seu consumo, em perspectiva.</h3></div>
                <span>EXEMPLO DE INTERFACE</span>
              </div>
              <div className="siva-dashboard__stats">
                <div><Droplets size={18} /><span>MEDIÇÃO DE VAZÃO</span><strong>Leitura contínua</strong></div>
                <div><Activity size={18} /><span>POR SETOR</span><strong>Visão organizada</strong></div>
                <div><ShieldCheck size={18} /><span>ACOMPANHAMENTO</span><strong>Histórico e status</strong></div>
              </div>
              <div className="siva-dashboard__chart">
                <div className="siva-dashboard__chart-meta"><span>COMPORTAMENTO DA VAZÃO</span><span className="siva-dashboard__chart-legend"><i/> Exemplo ilustrativo</span></div>
                <div className="siva-dashboard__plot">
                  <div className="siva-dashboard__plot-grid"/>
                  <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs><linearGradient id="siva-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#37b9fa" stopOpacity=".4"/><stop offset="1" stopColor="#37b9fa" stopOpacity="0"/></linearGradient></defs>
                    <polygon points={`0,100 ${polyline} 100,100`} fill="url(#siva-chart-fill)" />
                    <polyline className="siva-dashboard__wave" points={polyline} fill="none" stroke="#43c4ff" strokeWidth="1.15" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="siva-dashboard__hours"><span>06:00</span><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span></div>
              </div>
              <p className="siva-dashboard__disclaimer">* Prévia de interface com curva ilustrativa. Não representa leituras reais ou dados de clientes.</p>
            </div>
          </div>
          <div className="siva-solution__cards">
            <article className="siva-feature-card siva-feature-card--light">
              <span className="siva-feature-card__number">01 /</span>
              <div className="siva-feature-card__icon"><ChartNoAxesCombined size={26}/></div>
              <h3>Visão completa do consumo.</h3>
              <p>Acompanhe leituras de vazão e consulte o histórico de cada dispositivo, ativo ou setor.</p>
              <ArrowUpRight className="siva-feature-card__arrow" size={21} aria-hidden="true" />
            </article>
            <article className="siva-feature-card siva-feature-card--blue">
              <span className="siva-feature-card__number">02 /</span>
              <div className="siva-feature-card__icon"><Wrench size={26}/></div>
              <h3>Operação e manutenção conectadas.</h3>
              <p>Organize ativos, equipes e processos de manutenção em um único ambiente.</p>
              <ArrowUpRight className="siva-feature-card__arrow" size={21} aria-hidden="true" />
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
