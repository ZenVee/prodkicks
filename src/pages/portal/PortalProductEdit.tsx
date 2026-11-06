import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Eye, ImagePlus, Plus, X } from 'lucide-react';
import type { Product, ProductStatus, ProductAvailability, ProductLabel, ProductVariant } from '@/types';
import { productService } from '@/services/productService';
import { collectionService } from '@/services/collectionService';
import { useToast } from '@/hooks/useToast';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { slugify } from '@/utils/format';
import { mapSupabaseError } from '@/utils/errors';
import type { Collection } from '@/types';
import SlugField from '@/components/common/SlugField';
import CategoryIcon from '@/components/products/CategoryIcon';
import { DEFAULT_PRODUCT_CATEGORIES } from '@/data/productCategories';

const statuses: { value: ProductStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const availabilities: { value: ProductAvailability; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'limited', label: 'Limited' },
  { value: 'coming-soon', label: 'Coming Soon' },
  { value: 'sold-out', label: 'Sold Out' },
];

const labelOptions: { value: ProductLabel; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'limited', label: 'Limited' },
  { value: 'featured', label: 'Featured' },
];

export default function PortalProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { settings } = useSiteSettings();
  const isNew = !id || id === 'new';
  const categories =
    settings.productCategories.length > 0 ? settings.productCategories : DEFAULT_PRODUCT_CATEGORIES;
  const defaultCategory = categories[0]?.slug ?? 'footwear';

  const [product, setProduct] = useState<Partial<Product>>({
    name: '',
    slug: '',
    sku: '',
    category: defaultCategory,
    price: 0,
    currency: '$',
    color: '',
    description: '',
    status: 'draft',
    availability: 'available',
    labels: [],
    collectionId: null,
    variants: [],
    images: [],
  });
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newVariant, setNewVariant] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [slugLocked, setSlugLocked] = useState(true);

  useEffect(() => {
    if (!isNew) return;
    const slugs = new Set(categories.map((c) => c.slug));
    setProduct((prev) => ({
      ...prev,
      category: prev.category && slugs.has(prev.category) ? prev.category : defaultCategory,
    }));
  }, [isNew, defaultCategory, settings.productCategories]);

  useEffect(() => {
    collectionService.getActive().then(setCollections).catch(() => setCollections([]));
    if (!isNew && id) {
      productService
        .getById(id)
        .then((p) => {
          if (p) setProduct(p);
        })
        .catch((err) => showToast(mapSupabaseError(err).message, 'error'))
        .finally(() => setLoading(false));
    }
  }, [id, isNew, showToast]);

  const update = <K extends keyof Product>(field: K, value: Product[K]) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (publish = false) => {
    if (!product.name?.trim()) {
      showToast('Product name is required', 'error');
      return;
    }

    const data = {
      ...product,
      status: publish ? ('published' as const) : ('draft' as const),
    };

    setSaving(true);
    try {
      if (isNew) {
        await productService.create(data);
        showToast(publish ? 'Product published' : 'Draft saved', 'success');
      } else if (id) {
        await productService.update(id, data);
        showToast(publish ? 'Product published' : 'Draft saved', 'success');
      }
      navigate('/portal/products');
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addImage = () => {
    if (!imageUrl.trim()) return;
    update('images', [...(product.images ?? []), imageUrl.trim()]);
    setImageUrl('');
  };

  const removeImage = (idx: number) => {
    update('images', (product.images ?? []).filter((_, i) => i !== idx));
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    const imgs = [...(product.images ?? [])];
    const target = idx + dir;
    if (target < 0 || target >= imgs.length) return;
    [imgs[idx], imgs[target]] = [imgs[target], imgs[idx]];
    update('images', imgs);
  };

  const addVariant = () => {
    if (!newVariant.trim()) return;
    const variant: ProductVariant = { id: `v${Date.now()}`, label: newVariant.trim(), inStock: true };
    update('variants', [...(product.variants ?? []), variant]);
    setNewVariant('');
  };

  const removeVariant = (vid: string) => {
    update('variants', (product.variants ?? []).filter((v) => v.id !== vid));
  };

  const toggleVariantStock = (vid: string) => {
    update(
      'variants',
      (product.variants ?? []).map((v) => (v.id === vid ? { ...v, inStock: !v.inStock } : v)),
    );
  };

  const toggleLabel = (label: ProductLabel) => {
    const labels = product.labels ?? [];
    update('labels', labels.includes(label) ? labels.filter((l) => l !== label) : [...labels, label]);
  };

  const previewHref = product.slug ? `/products/${product.slug}` : '/';
  const images = product.images ?? [];
  const statusLabel = statuses.find((s) => s.value === product.status)?.label ?? 'Draft';

  if (loading) {
    return <p className="text-sm text-bone-muted py-12 text-center">Loading product…</p>;
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div className="min-w-0">
          <Link
            to="/portal/products"
            className="group inline-flex items-center gap-2 text-xs tracking-wider uppercase text-bone-muted hover:text-lime transition-colors mb-3"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Products
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone">
              {isNew ? 'New Product' : 'Edit Product'}
            </h1>
            <span
              className={`text-[10px] tracking-wider uppercase px-2 py-1 border ${
                product.status === 'published'
                  ? 'text-lime border-lime/40'
                  : product.status === 'archived'
                    ? 'text-bone-muted/60 border-white/10'
                    : 'text-bone-muted border-white/15'
              }`}
            >
              {statusLabel}
            </span>
          </div>
          {!isNew && product.name ? (
            <p className="text-sm text-bone-muted mt-1 truncate">{product.name}</p>
          ) : null}
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Link
            to={previewHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 text-xs tracking-wider uppercase border border-white/10 text-bone-muted hover:text-bone hover:border-white/20 transition-colors"
          >
            <Eye size={14} />
            Preview
          </Link>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2 text-xs tracking-wider uppercase border border-white/15 text-bone hover:border-lime/50 hover:text-lime transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-4 py-2.5 text-xs tracking-wider uppercase bg-lime text-ink font-medium hover:bg-lime-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 lg:gap-8">
        {/* Main column */}
        <div className="space-y-6 min-w-0">
          <Section title="Details" hint="What shoppers see first">
            <Field label="Name">
              <input
                type="text"
                value={product.name ?? ''}
                onChange={(e) => {
                  const name = e.target.value;
                  setProduct((prev) => ({
                    ...prev,
                    name,
                    ...(slugLocked ? { slug: slugify(name) } : {}),
                  }));
                }}
                placeholder="e.g. Air Force 1 '07"
                className="portal-input text-lg"
                autoFocus={isNew}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="Colorway">
                <input
                  type="text"
                  value={product.color ?? ''}
                  onChange={(e) => update('color', e.target.value)}
                  placeholder="Black / White"
                  className="portal-input"
                />
              </Field>
              <Field label="Category">
                <div className="flex gap-1.5" role="radiogroup" aria-label="Category">
                  {categories.map((cat) => {
                    const active = (product.category ?? defaultCategory) === cat.slug;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={cat.label}
                        title={cat.label}
                        onClick={() => update('category', cat.slug)}
                        className={`flex-1 inline-flex items-center justify-center h-[38px] border transition-colors ${
                          active
                            ? 'border-lime bg-lime/10 text-lime'
                            : 'border-white/10 text-bone-muted hover:border-white/25 hover:text-bone'
                        }`}
                      >
                        <CategoryIcon name={cat.icon} size={16} />
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>

            <Field label="Description" className="mt-4">
              <textarea
                value={product.description ?? ''}
                onChange={(e) => update('description', e.target.value)}
                rows={5}
                placeholder="Material, fit, and story…"
                className="portal-input resize-y min-h-[120px]"
              />
            </Field>
          </Section>

          <Section
            title="Images"
            hint="First image is the cover"
            action={
              images.length > 0 ? (
                <span className="text-[10px] tracking-wider uppercase text-bone-muted">
                  {images.length} image{images.length === 1 ? '' : 's'}
                </span>
              ) : null
            }
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                placeholder="Paste image URL"
                className="portal-input flex-1"
              />
              <button
                type="button"
                onClick={addImage}
                disabled={!imageUrl.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs tracking-wider uppercase border border-white/10 text-lime hover:border-lime/50 transition-colors disabled:opacity-40"
              >
                <ImagePlus size={14} />
                Add
              </button>
            </div>

            {images.length === 0 ? (
              <div className="mt-4 border border-dashed border-white/10 px-4 py-10 text-center">
                <ImagePlus size={22} className="mx-auto text-bone-muted mb-2" />
                <p className="text-sm text-bone-muted">No images yet</p>
                <p className="text-xs text-bone-muted/70 mt-1">Paste a URL above to add the cover photo</p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={`${img}-${idx}`}
                    className="group relative aspect-[4/5] bg-ink-raised border border-white/10 overflow-hidden"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    {idx === 0 ? (
                      <span className="absolute top-2 left-2 text-[10px] tracking-wider uppercase bg-lime text-ink px-1.5 py-0.5 font-medium">
                        Cover
                      </span>
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-2 bg-gradient-to-t from-ink/90 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveImage(idx, -1)}
                          disabled={idx === 0}
                          className="p-1.5 bg-ink/70 text-bone hover:text-lime disabled:opacity-30"
                          aria-label="Move earlier"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(idx, 1)}
                          disabled={idx === images.length - 1}
                          className="p-1.5 bg-ink/70 text-bone hover:text-lime disabled:opacity-30"
                          aria-label="Move later"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="p-1.5 bg-ink/70 text-bone-muted hover:text-red-500"
                        aria-label="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Sizes & variants" hint="Tap a size to toggle stock">
            {(product.variants ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {(product.variants ?? []).map((v) => (
                  <div
                    key={v.id}
                    className={`inline-flex items-center gap-1 border transition-colors ${
                      v.inStock
                        ? 'border-white/15 bg-ink-raised'
                        : 'border-white/5 bg-ink/40 opacity-60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleVariantStock(v.id)}
                      className="px-3 py-2 text-sm text-bone hover:text-lime transition-colors"
                      title={v.inStock ? 'Mark out of stock' : 'Mark in stock'}
                    >
                      {v.label}
                      <span className="ml-2 text-[10px] tracking-wider uppercase text-bone-muted">
                        {v.inStock ? 'In' : 'Out'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeVariant(v.id)}
                      className="pr-2 text-bone-muted hover:text-red-500"
                      aria-label={`Remove ${v.label}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-bone-muted mb-4">No sizes yet — add one below.</p>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newVariant}
                onChange={(e) => setNewVariant(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVariant())}
                placeholder="Size label (e.g. 08, M, XL)"
                className="portal-input flex-1"
              />
              <button
                type="button"
                onClick={addVariant}
                disabled={!newVariant.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs tracking-wider uppercase border border-white/10 text-lime hover:border-lime/50 transition-colors disabled:opacity-40"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </Section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Section title="Pricing">
            <Field label="Price">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-muted text-sm">
                  {product.currency || '$'}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={product.price ?? 0}
                  onChange={(e) => update('price', Number(e.target.value))}
                  className="portal-input pl-7"
                />
              </div>
            </Field>
          </Section>

          <Section title="Availability">
            <Field label="Status">
              <select
                value={product.status ?? 'draft'}
                onChange={(e) => update('status', e.target.value as ProductStatus)}
                className="portal-input"
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stock status" className="mt-4">
              <select
                value={product.availability ?? 'available'}
                onChange={(e) => update('availability', e.target.value as ProductAvailability)}
                className="portal-input"
              >
                {availabilities.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Labels" className="mt-4">
              <div className="flex flex-wrap gap-2">
                {labelOptions.map((opt) => {
                  const active = (product.labels ?? []).includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleLabel(opt.value)}
                      className={`px-3 py-1.5 text-xs tracking-wider uppercase border transition-colors ${
                        active
                          ? 'bg-lime/10 text-lime border-lime'
                          : 'text-bone-muted border-white/10 hover:border-white/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>

          <Section title="Organization">
            <Field label="Collection">
              <select
                value={product.collectionId ?? ''}
                onChange={(e) => update('collectionId', e.target.value || null)}
                className="portal-input"
              >
                <option value="">None</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="SKU" className="mt-4">
              <input
                type="text"
                value={product.sku ?? ''}
                onChange={(e) => update('sku', e.target.value)}
                placeholder="Optional"
                className="portal-input font-mono text-xs"
              />
            </Field>
            <SlugField
              className="mt-4"
              value={product.slug ?? ''}
              onChange={(slug) => update('slug', slug)}
              onLockChange={setSlugLocked}
            />
          </Section>
        </aside>
      </div>

      {/* Mobile sticky actions */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink/95 backdrop-blur px-4 py-3 flex gap-2">
        <Link
          to={previewHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center px-3 py-3 border border-white/10 text-bone-muted"
          aria-label="Preview"
        >
          <Eye size={16} />
        </Link>
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex-1 px-4 py-3 text-xs tracking-wider uppercase border border-white/15 text-bone disabled:opacity-50"
        >
          Draft
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex-1 px-4 py-3 text-xs tracking-wider uppercase bg-lime text-ink font-medium disabled:opacity-50"
        >
          Publish
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-ink-surface border border-white/5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm tracking-wider uppercase text-bone">{title}</h2>
          {hint ? <p className="text-xs text-bone-muted mt-1">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}
