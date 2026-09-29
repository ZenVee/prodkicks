import { Link } from 'react-router-dom';
import type { Drop } from '@/types';
import Countdown from '@/components/common/Countdown';

interface UpcomingDropSectionProps {
  drop: Drop;
}

export default function UpcomingDropSection({ drop }: UpcomingDropSectionProps) {
  const fullDateStr = `${drop.releaseDate}T20:00:00`;

  return (
    <section className="relative bg-ink-surface border-y border-white/5 py-16 lg:py-28 overflow-hidden">
      {/* Giant background text */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <p className="font-display text-[25vw] leading-none text-white/[0.015] whitespace-nowrap tracking-tighter select-none">
          {drop.campaignHeadline} {drop.campaignSubtitle}
        </p>
      </div>

      <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Image */}
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden bg-ink-raised group">
              <img
                src={drop.heroImage}
                alt={drop.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-ink/30" />
              <div className="absolute top-4 left-4">
                <span className="text-xs tracking-widest2 uppercase text-lime font-mono">
                  {drop.heroLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-lime" />
              <span className="text-xs tracking-widest2 uppercase text-bone-muted">
                Next from Prod.
              </span>
            </div>

            <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl leading-[0.85] tracking-tighter text-bone">
              {drop.campaignHeadline}
            </h2>
            <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl leading-[0.85] tracking-tighter text-bone">
              {drop.campaignSubtitle}
            </h2>

            <p className="mt-3 text-sm tracking-widest2 uppercase text-bone-muted">
              {drop.heroLabel}
            </p>

            {/* Countdown */}
            <div className="mt-10">
              <Countdown targetDate={fullDateStr} size="lg" />
            </div>

            {/* Date */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <p className="text-sm text-bone tracking-wider">
                {new Date(drop.releaseDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                }).toUpperCase()}
                {' · '}
                <span className="text-lime">{drop.releaseTime}</span>
              </p>
            </div>

            <div className="mt-6">
              <Link
                to={`/collections/${drop.collectionId ? 'no-signal' : 'no-signal'}`}
                className="group inline-flex items-center gap-2 text-sm tracking-wider uppercase text-bone hover:text-lime transition-colors"
              >
                View Collection
                <span className="w-0 group-hover:w-8 h-px bg-lime transition-all duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
