import { useState } from 'react';
import { AboutSection } from '../features/landing/components/AboutSection';
import { CinematicIntro } from '../features/landing/components/CinematicIntro';
import { FeaturesSection } from '../features/landing/components/FeaturesSection';
import { HeroSection } from '../features/landing/components/HeroSection';
import { HowItWorksSection } from '../features/landing/components/HowItWorksSection';
import { RestrictedAccessSection } from '../features/landing/components/RestrictedAccessSection';
import { SiteFooter } from '../features/landing/components/SiteFooter';
import { SiteHeader } from '../features/landing/components/SiteHeader';
import '../features/landing/landing-cinematic.css';

export default function LandingPage() {
  const [replayToken, setReplayToken] = useState(0);
  return (
    <div className="siva-site">
      <a href="#visao" className="siva-skip-link">Pular para o conteúdo</a>
      <CinematicIntro replayToken={replayToken} />
      <SiteHeader />
      <main>
        <HeroSection onReplay={() => setReplayToken((value) => value + 1)} />
        <AboutSection />
        <FeaturesSection />
        <HowItWorksSection />
        <RestrictedAccessSection />
      </main>
      <SiteFooter />
    </div>
  );
}
