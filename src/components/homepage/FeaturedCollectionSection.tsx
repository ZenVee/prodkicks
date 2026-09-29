import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Collection } from '@/types';

interface FeaturedCollectionSectionProps {
  collection: Collection;
}

export default function FeaturedCollectionSection({ collection }: FeaturedCollectionSectionProps) {
  return (
    <section className="relative bg-ink-surface py-16 lg:py-24 overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Image */}
          <div className="lg:col-span-7 order-1 lg:order-1">
            <div className="relative aspect-[16/10] overflow-hidden bg-ink-raised group">
              <img
                src={collection.campaignImage}
                alt={collection.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-ink/20" />
              <div className="absolute top-4 left-4">
                <span className="text-xs tracking-widest2 uppercase text-lime font-mono">
                  FEATURED COLLECTION
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-5 order-2 lg:order-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-lime" />
              <span className="text-xs tracking-widest2 uppercase text-bone-muted">
                Collection
              </span>
            </div>
            <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.85] tracking-tighter text-bone">
              {collection.name}
            </h2>
            <p className="mt-6 text-sm lg:text-base text-bone-muted leading-relaxed max-w-md">
              {collection.description}
            </p>
            <Link
              to={`/collections/${collection.slug}`}
              className="group mt-8 inline-flex items-center gap-3 text-sm tracking-wider uppercase text-bone hover:text-lime transition-colors"
            >
              View Collection
              <ArrowRight size={16} className="text-lime group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
