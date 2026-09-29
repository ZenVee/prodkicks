import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Drop } from '@/types';

interface HeroSectionProps {
  drop: Drop;
}

export default function HeroSection({ drop }: HeroSectionProps) {
  return (
    <section className="relative min-h-[90vh] lg:min-h-screen flex items-end overflow-hidden bg-ink">
      {/* Background giant text */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <p className="font-display text-[40vw] lg:text-[30vw] leading-none text-white/[0.02] whitespace-nowrap tracking-tighter select-none">
          PROD.
        </p>
      </div>

      {/* Image side */}
      <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[55%] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/60 to-transparent lg:from-ink/80 lg:via-ink/20 lg:to-transparent z-10" />
        <img
          src={drop.heroImage}
          alt={drop.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-ink/20" />
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pb-12 lg:pb-20 pt-32 w-full">
        <div className="max-w-2xl">
          {/* Label */}
          <div className="flex items-center gap-3 mb-6 animate-fade-up">
            <span className="w-8 h-px bg-lime" />
            <span className="text-xs tracking-widest2 uppercase text-lime font-mono">
              {drop.heroLabel}
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-[16vw] sm:text-[12vw] lg:text-[8vw] leading-[0.85] tracking-tighter text-bone text-shadow-dark animate-fade-up animate-delay-100">
            {drop.campaignHeadline}
          </h1>
          <h1 className="font-display text-[16vw] sm:text-[12vw] lg:text-[8vw] leading-[0.85] tracking-tighter text-bone text-shadow-dark animate-fade-up animate-delay-200">
            {drop.campaignSubtitle}
          </h1>

          {/* Metadata */}
          <p className="mt-6 text-xs tracking-widest2 uppercase text-bone-muted animate-fade-up animate-delay-300">
            {drop.season}
          </p>

          {/* Description */}
          <p className="mt-4 max-w-md text-sm lg:text-base text-bone/80 leading-relaxed animate-fade-up animate-delay-300">
            {drop.campaignDescription}
          </p>

          {/* CTA */}
          <div className="mt-8 animate-fade-up animate-delay-400">
            <Link
              to={`/collections/${drop.collectionId ? 'after-hours' : 'after-hours'}`}
              className="group inline-flex items-center gap-3 px-6 py-3.5 bg-lime text-ink font-medium text-sm tracking-wider uppercase hover:bg-lime-dark transition-colors"
            >
              Explore the Drop
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Decorative details */}
          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] tracking-widest2 uppercase text-bone-muted/60 font-mono animate-fade-up animate-delay-500">
            <span>PK / 026</span>
            <span className="w-1 h-1 bg-bone-muted/40 rounded-full" />
            <span>EST. 2026</span>
            <span className="w-1 h-1 bg-bone-muted/40 rounded-full" />
            <span>FOOTWEAR / APPAREL / CULTURE</span>
          </div>
        </div>
      </div>
    </section>
  );
}
