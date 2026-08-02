import HeroSection from "@/components/landing/HeroSection";
import TrustSection from "@/components/landing/TrustSection";
import WhyEduSection from "@/components/landing/WhyEduSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import SkillsSection from "@/components/landing/SkillsSection";
import MockTestSection from "@/components/landing/MockTestSection";
import StoriesSection from "@/components/landing/StoriesSection";

/**
 * The public landing page, built from the Claude Design prototype
 * (`EDU Landing Page.dc.html`).
 *
 * Section order is the prototype's: hero, trust, why, how it works, skills,
 * mock test, stories, footer. The prototype's CTA block is an empty comment —
 * it was deliberately left out — so there is no closing CTA band here either.
 *
 * The hero owns its own top padding (150px in the prototype) and clears the
 * fixed navbar itself, so unlike the previous build there is no `pt-16` on this
 * wrapper — that would have stacked on top of the hero's own spacing.
 *
 * `overflow-x-hidden` is a backstop: the prototype is authored desktop-only at a
 * fixed 1180px, and a single unconstrained grid track on a page this long
 * produces a horizontal scrollbar on mobile.
 */
function LandingPage() {
  return (
    <div className="w-full overflow-x-hidden bg-white">
      <HeroSection />
      <TrustSection />
      <WhyEduSection />
      <HowItWorksSection />
      <SkillsSection />
      <MockTestSection />
      <StoriesSection />
    </div>
  );
}

export default LandingPage;
