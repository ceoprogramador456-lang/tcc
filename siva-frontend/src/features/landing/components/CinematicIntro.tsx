import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';

import { BrandLogo } from '../../../components/brand/BrandLogo';
import { INTRO_SESSION_KEY, WATER_FOOTAGE } from '../media/footage';

type Scene = 'fall' | 'impact' | 'reveal';

function shouldPlayIntro() {
  if (typeof window === 'undefined') return false;
  try {
    return (
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      window.sessionStorage.getItem(INTRO_SESSION_KEY) !== '1'
    );
  } catch {
    return false;
  }
}

interface CinematicIntroProps {
  replayToken: number;
  onFinished?: () => void;
}

/** Animação narrativa de 4.9s; nunca impede o acesso ao site. */
export function CinematicIntro({ replayToken, onFinished }: CinematicIntroProps) {
  const [visible, setVisible] = useState(() => shouldPlayIntro());
  const [scene, setScene] = useState<Scene>('fall');
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    if (replayToken === 0) return;
    setScene('fall');
    setVideoFailed(false);
    setVisible(true);
  }, [replayToken]);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const impact = window.setTimeout(() => setScene('impact'), 1500);
    const reveal = window.setTimeout(() => setScene('reveal'), 2600);
    const finish = window.setTimeout(() => endIntro(), 4900);
    return () => {
      window.clearTimeout(impact);
      window.clearTimeout(reveal);
      window.clearTimeout(finish);
      document.body.style.overflow = previousOverflow;
    };
    // Os timers iniciam a cada montagem da introdução, não a cada mudança de cena.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, replayToken]);

  function endIntro() {
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    } catch {
      // Navegação privada ou armazenamento bloqueado: a experiência continua.
    }
    setVisible(false);
    onFinished?.();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="siva-intro"
          role="dialog"
          aria-modal="true"
          aria-label="Abertura cinematográfica do SIVA"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.9, ease: 'easeInOut' } }}
        >
          {!videoFailed && (
            <>
              <video
                className={`siva-intro__film siva-intro__film--fall ${scene === 'fall' ? 'is-visible' : ''}`}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden="true"
                onError={() => setVideoFailed(true)}
              >
                <source src={WATER_FOOTAGE.waterfall} type="video/mp4" />
              </video>
              <video
                className={`siva-intro__film siva-intro__film--impact ${scene !== 'fall' ? 'is-visible' : ''}`}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
              >
                <source src={WATER_FOOTAGE.impact} type="video/mp4" />
              </video>
            </>
          )}
          <div className="siva-intro__shade" aria-hidden="true" />
          <div className={`siva-intro__impact-light ${scene !== 'fall' ? 'is-visible' : ''}`} aria-hidden="true" />
          <div className="siva-intro__topline">
            <span>SIVA / SISTEMA INTELIGENTE DE VAZÃO DE ÁGUA</span>
            <button onClick={endIntro} type="button" className="siva-intro__skip">
              Pular introdução <ArrowUpRight size={13} aria-hidden="true" />
            </button>
          </div>
          <div className={`siva-intro__reveal ${scene === 'reveal' ? 'is-visible' : ''}`}>
            <div className="siva-intro__reveal-halo" aria-hidden="true" />
            <BrandLogo className="siva-intro__logo" />
            <p>INTELIGÊNCIA EM CADA GOTA.</p>
          </div>
          <div className="siva-intro__footer" aria-hidden="true">
            <span>UMA NOVA FORMA DE ENXERGAR A ÁGUA</span>
            <span>EXPERIÊNCIA 01 / 01</span>
          </div>
          <div className="siva-intro__progress" aria-hidden="true" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
