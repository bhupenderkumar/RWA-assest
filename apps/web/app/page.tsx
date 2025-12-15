import { Hero, Features, HowItWorks, FeaturedAssets, Partners, CTA } from '@/components/landing';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <Features />
      <HowItWorks />
      <FeaturedAssets />
      <Partners />
      <CTA />
    </div>
  );
}
