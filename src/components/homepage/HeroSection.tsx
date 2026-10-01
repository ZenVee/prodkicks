import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Article, Drop } from '@/types';
import Countdown from '@/components/common/Countdown';
import { dropReleaseTarget } from '@/utils/format';

export type HeroSlide =
  | { kind: 'drop'; drop: Drop; image?: string; collectionSlug?: string }
  | { kind: 'article'; article: Article; image?: string };

interface HeroSectionProps {
  slides: HeroSlide[];
}

function slideKey(slide: HeroSlide): string {
  return slide.kind === 'drop' ? `drop-${slide.drop.id}` : `article-${slide.article.id}`;
}

export default function HeroSection({ slides }: HeroSectionProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const active = slides[Math.min(index, Math.max(count - 1, 0))];

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (!active) return null;

  const go = (next: number) => {
    if (count <= 1) return;
    setIndex((next + count) % count);
  };

  const exploreTo =
    active.kind === 'drop'
      ? active.collectionSlug
        ? `/collections/${active.collectionSlug}`
        : '/#shop'
      : `/magazine/${active.article.slug}`;

  return (
    <section
      className="relative h-[560px] sm:h-[600px] lg:h-[640px] overflow-hidden bg-ink"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => {
        const src =
          slide.kind === 'drop'
            ? slide.image || slide.drop.heroImage
            : slide.image || slide.article.coverImage;
        const visible = i === index;
        return (
          <div
            key={slideKey(slide)}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-hidden={!visible}
          >
            <img
              src={src}
              alt=""
              className={`h-full w-full object-cover transition-transform duration-[7000ms] ease-out ${
                visible ? 'scale-105' : 'scale-100'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/40" />
          </div>
        );
      })}

      <div className="relative z-10 flex h-full flex-col justify-end">
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-end px-4 pb-8 pt-24 sm:px-6 lg:px-10 lg:pb-10 lg:pt-28">
          <div key={slideKey(active)} className="max-w-xl">
            <div className="mb-4 flex items-center gap-3 animate-fade-up">
              <span className="h-px w-8 bg-lime" />
              <span className="text-xs tracking-widest2 uppercase text-lime font-mono">
                {active.kind === 'drop' ? active.drop.heroLabel : 'Magazine'}
              </span>
            </div>

            {active.kind === 'drop' ? (
              <>
                <h1 className="font-display text-[12vw] leading-[0.85] tracking-tighter text-bone sm:text-6xl lg:text-7xl animate-fade-up animate-delay-100">
                  <span className="block">{active.drop.campaignHeadline}</span>
                  <span className="block">{active.drop.campaignSubtitle}</span>
                </h1>
                <p className="mt-3 text-xs tracking-widest2 uppercase text-bone-muted animate-fade-up animate-delay-200">
                  {active.drop.season}
                </p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-bone/75 line-clamp-2 animate-fade-up animate-delay-200">
                  {active.drop.campaignDescription}
                </p>
                {active.drop.showCountdown && (
                  <div className="mt-5 animate-fade-up animate-delay-300">
                    <Countdown
                      targetDate={dropReleaseTarget(active.drop.releaseDate, active.drop.releaseTime)}
                      size="sm"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 className="font-display text-[10vw] leading-[0.9] tracking-tighter text-bone sm:text-5xl lg:text-6xl animate-fade-up animate-delay-100">
                  {active.article.title}
                </h1>
                {active.article.excerpt ? (
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-bone/75 line-clamp-2 animate-fade-up animate-delay-200">
                    {active.article.excerpt}
                  </p>
                ) : null}
                {active.article.authorName ? (
                  <p className="mt-3 text-xs tracking-widest2 uppercase text-bone-muted animate-fade-up animate-delay-200">
                    {active.article.authorName}
                  </p>
                ) : null}
              </>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-4 animate-fade-up animate-delay-300">
              <Link
                to={exploreTo}
                className="group inline-flex items-center gap-3 bg-lime px-5 py-3 text-sm font-medium tracking-wider uppercase text-ink transition-colors hover:bg-lime-dark"
              >
                {active.kind === 'drop' ? 'Explore the Drop' : 'Read Article'}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>

              {count > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => go(index - 1)}
                    aria-label="Previous slide"
                    className="border border-white/15 p-2.5 text-bone-muted transition-colors hover:border-lime/50 hover:text-lime"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(index + 1)}
                    aria-label="Next slide"
                    className="border border-white/15 p-2.5 text-bone-muted transition-colors hover:border-lime/50 hover:text-lime"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {count > 1 && (
            <div className="mt-6 flex items-center gap-3">
              {slides.map((slide, i) => (
                <button
                  key={slideKey(slide)}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={
                    slide.kind === 'drop'
                      ? `Show ${slide.drop.name}`
                      : `Show ${slide.article.title}`
                  }
                  aria-current={i === index}
                  className={`h-px transition-all ${
                    i === index ? 'w-10 bg-lime' : 'w-6 bg-white/25 hover:bg-white/50'
                  }`}
                />
              ))}
              <span className="ml-2 text-[10px] tracking-widest2 uppercase text-bone-muted font-mono">
                {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
