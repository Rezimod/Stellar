import HeroSection from '@/components/landing/HeroSection';
import PartnersSection from '@/components/landing/PartnersSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import MissionsSection from '@/components/landing/MissionsSection';
import MarketplaceSection from '@/components/landing/MarketplaceSection';
import StackSection from '@/components/landing/StackSection';
import ClosingCtaSection from '@/components/landing/ClosingCtaSection';

export default function HomePage() {
  return (
    <div className="bg-[var(--canvas)] text-[#E8E6DD] overflow-x-hidden -mt-14 pt-14">
      <HeroSection />
      <PartnersSection />
      <HowItWorksSection />
      <MissionsSection />
      <MarketplaceSection />
      <StackSection />
      <ClosingCtaSection />
    </div>
  );
}
