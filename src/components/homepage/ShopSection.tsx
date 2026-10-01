import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import type { Product, ProductCategory } from '@/types';
import { productService } from '@/services/productService';
import ProductCard from '@/components/products/ProductCard';
import { ProductCardSkeleton } from '@/components/common/Skeleton';

type FilterCategory = ProductCategory | 'all' | 'new-releases' | 'limited';
type SortOption = 'newest' | 'name-az' | 'price-low' | 'price-high';

const filterButtons: { label: string; value: FilterCategory }[] = [
  { label: 'ALL', value: 'all' },
  { label: 'FOOTWEAR', value: 'footwear' },
  { label: 'TOPS', value: 'tops' },
  { label: 'BOTTOMS', value: 'bottoms' },
  { label: 'ACCESSORIES', value: 'accessories' },
  { label: 'NEW RELEASES', value: 'new-releases' },
  { label: 'LIMITED', value: 'limited' },
];

const sortOptions: { label: string; value: SortOption }[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Name A-Z', value: 'name-az' },
  { label: 'Price Low-High', value: 'price-low' },
  { label: 'Price High-Low', value: 'price-high' },
];

export default function ShopSection({ featuredProductIds }: { featuredProductIds?: string[] } = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const labels: string[] = [];
    if (filter === 'new-releases') labels.push('new');
    if (filter === 'limited') labels.push('limited');
    const category = filter === 'new-releases' || filter === 'limited' ? 'all' : filter;

    productService
      .filter({
        category,
        search,
        sort,
        labels,
        productIds: featuredProductIds?.length ? featuredProductIds : undefined,
      })
      .then((result) => {
        if (!cancelled) {
          setProducts(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [filter, search, sort, featuredProductIds]);

  const currentSortLabel = useMemo(
    () => sortOptions.find((o) => o.value === sort)?.label ?? 'Newest',
    [sort]
  );

  return (
    <section id="shop" className="bg-ink py-16 lg:py-24 scroll-mt-20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-8 h-px bg-lime" />
              <span className="text-xs tracking-widest2 uppercase text-bone-muted">
                Catalog
              </span>
            </div>
            <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl leading-none tracking-tighter text-bone">
              SHOP
            </h2>
          </div>
          <p className="text-sm tracking-widest2 uppercase text-bone-muted font-mono">
            {String(products.length).padStart(3, '0')} ITEMS
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Filter buttons */}
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 min-w-max">
              {filterButtons.map((btn) => {
                const active = filter === btn.value;
                return (
                  <button
                    key={btn.value}
                    onClick={() => setFilter(btn.value)}
                    className={`px-3.5 py-2 text-xs tracking-widest2 uppercase font-medium transition-colors whitespace-nowrap border ${
                      active
                        ? 'bg-lime text-ink border-lime'
                        : 'text-bone-muted hover:text-bone border-white/10 hover:border-white/20'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search + Sort */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 lg:flex-initial">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-muted" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full lg:w-44 pl-9 pr-3 py-2 text-sm bg-ink-surface border border-white/10 text-bone placeholder:text-bone-muted focus:border-lime/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs tracking-wider uppercase bg-ink-surface border border-white/10 text-bone hover:border-white/20 transition-colors"
              >
                {currentSortLabel}
                <ChevronDown size={14} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-ink-surface border border-white/10 z-20 animate-slide-down">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => { setSort(option.value); setSortOpen(false); }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs tracking-wider uppercase transition-colors ${
                          sort === option.value
                            ? 'text-lime bg-lime/5'
                            : 'text-bone-muted hover:text-bone hover:bg-ink-raised'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-sm tracking-wider uppercase text-bone-muted">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
