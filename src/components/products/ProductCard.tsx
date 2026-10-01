import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Product, ProductBadge } from '@/types';
import { formatPrice } from '@/utils/format';
import { useSiteSettings } from '@/hooks/useSiteSettings';

function getBadge(product: Product): ProductBadge | null {
  if (product.availability === 'sold-out') return 'SOLD OUT';
  if (product.availability === 'coming-soon') return 'COMING SOON';
  if (product.labels.includes('limited')) return 'LIMITED';
  if (product.labels.includes('new')) return 'NEW';
  return null;
}

const badgeStyles: Record<ProductBadge, string> = {
  'NEW': 'bg-lime text-ink',
  'LIMITED': 'bg-bone text-ink',
  'COMING SOON': 'bg-ink-raised text-bone border border-white/20',
  'SOLD OUT': 'bg-ink-raised text-bone-muted border border-white/10 line-through',
};

export default function ProductCard({ product }: { product: Product }) {
  const badge = getBadge(product);
  const { settings } = useSiteSettings();
  const currency = settings.currencySymbol || product.currency;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block"
    >
      <div className="relative overflow-hidden bg-ink-surface border border-white/5 group-hover:border-lime/30 transition-colors duration-300">
        <div className="aspect-[4/5] overflow-hidden bg-ink-raised">
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </div>

        {badge && (
          <div className="absolute top-3 left-3">
            <span className={`inline-block px-2.5 py-1 text-[10px] font-bold tracking-widest2 uppercase ${badgeStyles[badge]}`}>
              {badge}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
          <span className="flex items-center gap-1.5 text-sm font-medium text-bone tracking-wider uppercase">
            View Item
            <ArrowUpRight size={16} className="text-lime" />
          </span>
        </div>
      </div>

      <div className="pt-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-bone truncate group-hover:text-lime transition-colors">
              {product.name}
            </h3>
            <p className="text-xs text-bone-muted uppercase tracking-wider mt-0.5">
              {product.category}
            </p>
          </div>
          <p className="text-sm font-medium text-lime whitespace-nowrap">
            {formatPrice(product.price, currency)}
          </p>
        </div>
      </div>
    </Link>
  );
}
