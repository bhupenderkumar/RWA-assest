'use client';

import Link from 'next/link';
import { ArrowRight, Rocket } from 'lucide-react';
import { GlowButton } from '@/components/shared/GlowButton';

export function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-primary opacity-90" />
      <div className="absolute inset-0 pattern-grid opacity-10" />
      
      {/* Floating Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-float animation-delay-400" />
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-float animation-delay-700" />
      
      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center text-white">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-8 animate-bounce-slow">
            <Rocket className="h-8 w-8" />
          </div>
          
          {/* Content */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 animate-fade-in-up">
            Ready to Start Investing?
          </h2>
          <p className="text-lg md:text-xl opacity-90 mb-10 max-w-2xl mx-auto animate-fade-in-up animation-delay-100">
            Join thousands of investors accessing institutional-grade assets on the blockchain. 
            Start with as little as $50.
          </p>
          
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-200">
            <GlowButton asChild size="xl" variant="glass">
              <Link href="/marketplace">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </GlowButton>
            <GlowButton asChild size="xl" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Link href="/kyc">
                Complete KYC First
              </Link>
            </GlowButton>
          </div>
          
          {/* Trust Text */}
          <p className="mt-8 text-sm opacity-70 animate-fade-in-up animation-delay-300">
            No credit card required • Instant wallet connection • Start investing in minutes
          </p>
        </div>
      </div>
    </section>
  );
}
