import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Collection, Product } from '@/types';
import { collectionService } from '@/services/collectionService';
import { productService } from '@/services/productService';
import ProductCard from '@/components/products/ProductCard';

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    collectionService.getBySlug(slug).then(async (col) => {
      setCollection(col);
      if (col) {
        const all = await productService.getAll();
        const colProducts = all.filter((p) => col.productIds.includes(p.id));
        setProducts(colProducts);
      }
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink pt-20 flex items-center justify-center">
        <p className="text-sm tracking-wider uppercase text-bone-muted">Loading...</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-ink pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-4xl text-bone mb-4">COLLECTION NOT FOUND</p>
          <Link to="/" className="text-sm text-lime hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink pt-16 lg:pt-20">
      {/* Campaign Hero */}
      <section className="relative h-[60vh] lg:h-[70vh] overflow-hidden flex items-end">
        <div className="absolute inset-0">
          <img
            src={collection.campaignImage}
            alt={collection.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
        </div>

        {/* Background giant text */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <p className="font-display text-[30vw] leading-none text-white/[0.02] whitespace-nowrap tracking-tighter select-none">
            {collection.name}
          </p>
        </div>

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pb-12 lg:pb-16 w-full">
          <div className="flex items-center gap-3 mb-4 animate-fade-up">
            <span className="w-8 h-px bg-lime" />
            <span className="text-xs tracking-widest2 uppercase text-lime">Collection</span>
          </div>
          <h1 className="font-display text-[14vw] sm:text-[10vw] lg:text-[7vw] leading-[0.85] tracking-tighter text-bone text-shadow-dark animate-fade-up animate-delay-100">
            {collection.campaignHeadline}
          </h1>
          <h1 className="font-display text-[14vw] sm:text-[10vw] lg:text-[7vw] leading-[0.85] tracking-tighter text-bone text-shadow-dark animate-fade-up animate-delay-200">
            {collection.campaignSubtitle}
          </h1>
        </div>
      </section>

      {/* Description */}
      <section className="bg-ink-surface border-y border-white/5 py-12 lg:py-16">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm lg:text-base text-bone-muted leading-relaxed">
              {collection.description}
            </p>
            <p className="mt-4 text-xs tracking-widest2 uppercase text-bone-muted font-mono">
              {String(products.length).padStart(3, '0')} ITEMS IN COLLECTION
            </p>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="bg-ink py-16 lg:py-24">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-xs tracking-wider uppercase text-bone-muted hover:text-lime transition-colors mb-8"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Back
          </Link>
          {products.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-sm tracking-wider uppercase text-bone-muted">No products in this collection</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
