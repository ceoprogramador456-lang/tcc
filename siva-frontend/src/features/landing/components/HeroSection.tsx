import { ArrowDownRight, ArrowUpRight, Play, Waves } from 'lucide-react';
import { motion } from 'motion/react';

import { WATER_FOOTAGE } from '../media/footage';

interface Props { onReplay: () => void }

export function HeroSection({ onReplay }: Props) {
  return (
    <section id="inicio" className="siva-hero" aria-labelledby="hero-title">
      <video
        className="siva-hero__video"
        autoPlay muted loop playsInline preload="none"
        poster="https://images.pexels.com/videos/5762682/pexels-photo-5762682.jpeg?auto=compress&cs=tinysrgb&w=1600"
        aria-hidden="true"
      >
        <source src={WATER_FOOTAGE.waterfall} type="video/mp4" />
      </video>
      <div className="siva-hero__layers" aria-hidden="true" />
      <div className="siva-hero__grid" aria-hidden="true" />
      <div className="siva-container siva-hero__content">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, delay: 0.16 }} className="siva-hero__text">
          <div className="siva-kicker siva-kicker--light"><span className="siva-kicker__dot" /> A NOVA INTELIGÊNCIA DA ÁGUA</div>
          <h1 id="hero-title">A água se move.<br /><em>O controle é seu.</em></h1>
          <p>Transforme cada fluxo em informação. Monitore a vazão, acompanhe os setores da sua operação e tome decisões com mais clareza.</p>
          <div className="siva-hero__actions">
            <a href="#solucao" className="siva-btn siva-btn--blue">Explore o SIVA <ArrowUpRight size={18} aria-hidden="true" /></a>
            <a href="#como-funciona" className="siva-btn siva-btn--outline">Como funciona <ArrowDownRight size={18} aria-hidden="true" /></a>
          </div>
        </motion.div>
        <div className="siva-hero__side" aria-hidden="true">
          <span>PRECISÃO • VISIBILIDADE • INTELIGÊNCIA</span>
          <div className="siva-hero__side-line" />
          <span>TECNOLOGIA PARA A INDÚSTRIA</span>
        </div>
      </div>
      <div className="siva-container siva-hero__bottom">
        <a href="#visao" className="siva-hero__scroll"><span className="siva-hero__scroll-icon"><ArrowDownRight size={17} /></span> Role para descobrir</a>
        <button type="button" className="siva-hero__replay" onClick={onReplay} aria-label="Rever a abertura cinematográfica">
          <Play size={12} fill="currentColor" aria-hidden="true" /> Rever a experiência
        </button>
        <div className="siva-hero__watermark"><Waves size={17} aria-hidden="true" /> ÁGUA • DADOS • CONTROLE</div>
      </div>
    </section>
  );
}
