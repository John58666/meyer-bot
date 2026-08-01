import { Hero } from "./_sections/hero";
import { SocialProof } from "./_sections/social-proof";
import { Problem } from "./_sections/problem";
import { HowItWorks } from "./_sections/how-it-works";
import { Features } from "./_sections/features";
import { Industries } from "./_sections/industries";
import { Demo } from "./_sections/demo";
import { Pricing } from "./_sections/pricing";
import { Faq } from "./_sections/faq";
import { CtaFooter } from "./_sections/cta-footer";

export default function LandingPage() {
  return (
    <div className="relative overflow-x-hidden">
      <div className="grain" />
      <Hero />
      <SocialProof />
      <Problem />
      <HowItWorks />
      <Features />
      <Industries />
      <Demo />
      <Pricing />
      <Faq />
      <CtaFooter />
    </div>
  );
}
