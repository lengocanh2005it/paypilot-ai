import { CtaSection } from './CtaSection';
import { FeaturesSection } from './FeaturesSection';
import { HeroSection } from './HeroSection';
import { LandingFooter } from './LandingFooter';
import { LandingNavbar } from './LandingNavbar';
import { PricingSection } from './PricingSection';
import { StatsBand } from './StatsBand';
import { StepsSection } from './StepsSection';

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <LandingNavbar />
      <main>
        <HeroSection />
        <StatsBand />
        <FeaturesSection />
        <StepsSection />
        <PricingSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
