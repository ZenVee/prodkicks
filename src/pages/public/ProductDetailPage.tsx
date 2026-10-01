import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Product } from '@/types';
import { productService } from '@/services/productService';
import { formatPrice } from '@/utils/format';
import ProductCard from '@/components/products/ProductCard';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const availabilityLabels: Record<string, string> = {
  'available': 'AVAILABLE',
  'limited': 'LIMITED STOCK',
  'coming-soon': 'COMING SOON',
  'sold-out': 'SOLD OUT',
};

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { settings } = useSiteSettings();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setActiveImage(0);
    setSelectedVariant(null);
    productService.getBySlug(slug).then(async (p) => {
      setProduct(p);
      if (p) {
        const rel = await productService.getRelated(p, 4);
        setRelated(rel);
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

  if (!product) {
    return (
      <div className="min-h-screen bg-ink pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-4xl text-bone mb-4">PRODUCT NOT FOUND</p>
          <Link to="/" className="text-sm text-lime hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink pt-16 lg:pt-20">
      {/* Back link */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 text-xs tracking-wider uppercase text-bone-muted hover:text-lime transition-colors"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Back to Shop
        </Link>
      </div>

      {/* Main layout */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pb-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Gallery */}
          <div>
            <div className="aspect-[4/5] overflow-hidden bg-ink-surface border border-white/5">
              <img
                src={product.images[activeImage] ?? product.images[0]}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-3 mt-3">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`relative w-20 h-24 overflow-hidden bg-ink-raised border transition-colors ${
                      activeImage === i ? 'border-lime' : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="lg:pl-6">
            {/* Label */}
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-px bg-lime" />
              <span className="text-xs tracking-widest2 uppercase text-bone-muted">
                {product.category}
              </span>
            </div>

            {/* Name */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[0.9] tracking-tighter text-bone">
              {product.name}
            </h1>

            {/* SKU */}
            <p className="mt-3 text-xs tracking-widest2 uppercase text-bone-muted font-mono">
              {product.sku}
            </p>

            {/* Price */}
            <p className="mt-6 font-display text-3xl lg:text-4xl text-lime">
              {formatPrice(product.price, settings.currencySymbol || product.currency)}
            </p>

            {/* Availability */}
            <div className="mt-4 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                product.availability === 'available' ? 'bg-lime' :
                product.availability === 'limited' ? 'bg-yellow-500' :
                product.availability === 'coming-soon' ? 'bg-blue-500' :
                'bg-red-500'
              }`} />
              <span className="text-xs tracking-widest2 uppercase text-bone">
                {availabilityLabels[product.availability] ?? 'AVAILABLE'}
              </span>
            </div>

            {/* Color */}
            <div className="mt-8 pt-8 border-t border-white/5">
              <p className="text-xs tracking-widest2 uppercase text-bone-muted mb-2">Color</p>
              <p className="text-sm text-bone">{product.color}</p>
            </div>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="mt-6">
                <p className="text-xs tracking-widest2 uppercase text-bone-muted mb-3">
                  Available Variants
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => v.inStock && setSelectedVariant(v.id)}
                      disabled={!v.inStock}
                      className={`min-w-[3rem] px-3 py-2.5 text-sm font-medium border transition-colors ${
                        !v.inStock
                          ? 'border-white/5 text-bone-muted/40 line-through cursor-not-allowed'
                          : selectedVariant === v.id
                          ? 'border-lime bg-lime/10 text-lime'
                          : 'border-white/10 text-bone hover:border-white/30'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mt-8 pt-8 border-t border-white/5">
              <p className="text-sm text-bone-muted leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Footer label */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <p className="text-xs tracking-widest2 uppercase text-bone-muted">
                Available at <span className="text-bone">Prod Kicks</span>
              </p>
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="mt-16 lg:mt-24 pt-12 border-t border-white/5">
          <h2 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone mb-6">
            PRODUCT DETAILS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs tracking-widest2 uppercase text-bone-muted mb-1">Category</p>
              <p className="text-sm text-bone capitalize">{product.category}</p>
            </div>
            <div>
              <p className="text-xs tracking-widest2 uppercase text-bone-muted mb-1">SKU</p>
              <p className="text-sm text-bone font-mono">{product.sku}</p>
            </div>
            <div>
              <p className="text-xs tracking-widest2 uppercase text-bone-muted mb-1">Color</p>
              <p className="text-sm text-bone">{product.color}</p>
            </div>
            <div>
              <p className="text-xs tracking-widest2 uppercase text-bone-muted mb-1">Availability</p>
              <p className="text-sm text-bone">{availabilityLabels[product.availability]}</p>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-16 lg:mt-24 pt-12 border-t border-white/5">
            <h2 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone mb-8">
              YOU MAY ALSO LIKE
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
