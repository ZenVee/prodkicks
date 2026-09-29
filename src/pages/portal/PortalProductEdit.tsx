import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Upload, X, GripVertical, Eye } from 'lucide-react';
import type { Product, ProductCategory, ProductStatus, ProductAvailability, ProductLabel, ProductVariant } from '@/types';
import { productService } from '@/services/productService';
import { collectionService } from '@/services/collectionService';
import { useToast } from '@/hooks/useToast';
import { slugify } from '@/utils/format';
import type { Collection } from '@/types';

const categories: ProductCategory[] = ['footwear', 'tops', 'bottoms', 'accessories'];
const statuses: ProductStatus[] = ['draft', 'published', 'archived'];
const availabilities: ProductAvailability[] = ['available', 'limited', 'coming-soon', 'sold-out'];
const labelOptions: ProductLabel[] = ['new', 'limited', 'featured'];

export default function PortalProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isNew = !id || id === 'new';

  const [product, setProduct] = useState<Partial<Product>>({
    name: '',
    slug: '',
    sku: '',
    category: 'footwear',
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

  useEffect(() => {
    collectionService.getActive().then(setCollections);
    if (!isNew && id) {
      productService.getById(id).then((p) => {
        if (p) setProduct(p);
      });
    }
  }, [id, isNew]);

  const update = (field: keyof Product, value: any) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (publish = false) => {
    const data = { ...product, status: publish ? 'published' : product.status };
    if (isNew) {
      await productService.create(data);
      showToast(publish ? 'Product published' : 'Draft saved', 'success');
    } else if (id) {
      await productService.update(id, data);
      showToast(publish ? 'Product published' : 'Changes saved', 'success');
    }
    navigate('/portal/products');
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

  const toggleLabel = (label: ProductLabel) => {
    const labels = product.labels ?? [];
    update('labels', labels.includes(label) ? labels.filter((l) => l !== label) : [...labels, label]);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/portal/products" className="group inline-flex items-center gap-2 text-xs tracking-wider uppercase text-bone-muted hover:text-lime transition-colors mb-4">
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Back to Products
      </Link>

      <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone mb-6">
        {isNew ? 'New Product' : 'Edit Product'}
      </h1>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-ink-surface border border-white/5 p-6">
          <h2 className="text-sm tracking-wider uppercase text-bone-muted mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Product Name">
              <input
                type="text"
                value={product.name ?? ''}
                onChange={(e) => { update('name', e.target.value); update('slug', slugify(e.target.value)); }}
                className="portal-input"
              />
            </Field>
            <Field label="SKU">
              <input type="text" value={product.sku ?? ''} onChange={(e) => update('sku', e.target.value)} className="portal-input" />
            </Field>
            <Field label="Slug">
              <input type="text" value={product.slug ?? ''} onChange={(e) => update('slug', e.target.value)} className="portal-input" />
            </Field>
            <Field label="Category">
              <select value={product.category ?? 'footwear'} onChange={(e) => update('category', e.target.value)} className="portal-input">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Price">
              <input type="number" value={product.price ?? 0} onChange={(e) => update('price', Number(e.target.value))} className="portal-input" />
            </Field>
            <Field label="Color">
              <input type="text" value={product.color ?? ''} onChange={(e) => update('color', e.target.value)} className="portal-input" />
            </Field>
          </div>
          <Field label="Description" className="mt-4">
            <textarea
              value={product.description ?? ''}
              onChange={(e) => update('description', e.target.value)}
              rows={4}
              className="portal-input resize-none"
            />
          </Field>
        </div>

        {/* Status & Availability */}
        <div className="bg-ink-surface border border-white/5 p-6">
          <h2 className="text-sm tracking-wider uppercase text-bone-muted mb-4">Status & Availability</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Status">
              <select value={product.status ?? 'draft'} onChange={(e) => update('status', e.target.value)} className="portal-input">
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Availability">
              <select value={product.availability ?? 'available'} onChange={(e) => update('availability', e.target.value)} className="portal-input">
                {availabilities.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Labels" className="mt-4">
            <div className="flex flex-wrap gap-2">
              {labelOptions.map((label) => (
                <button
                  key={label}
                  onClick={() => toggleLabel(label)}
                  className={`px-3 py-1.5 text-xs tracking-wider uppercase border transition-colors ${
                    (product.labels ?? []).includes(label)
                      ? 'bg-lime/10 text-lime border-lime'
                      : 'text-bone-muted border-white/10 hover:border-white/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Collection */}
        <div className="bg-ink-surface border border-white/5 p-6">
          <h2 className="text-sm tracking-wider uppercase text-bone-muted mb-4">Collection</h2>
          <Field label="Assign to Collection">
            <select
              value={product.collectionId ?? ''}
              onChange={(e) => update('collectionId', e.target.value || null)}
              className="portal-input"
            >
              <option value="">None</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        {/* Variants */}
        <div className="bg-ink-surface border border-white/5 p-6">
          <h2 className="text-sm tracking-wider uppercase text-bone-muted mb-4">Variants</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {(product.variants ?? []).map((v) => (
              <div key={v.id} className="flex items-center gap-2 px-3 py-1.5 bg-ink-raised border border-white/10">
                <span className="text-sm text-bone">{v.label}</span>
                <button onClick={() => removeVariant(v.id)} className="text-bone-muted hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newVariant}
              onChange={(e) => setNewVariant(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVariant())}
              placeholder="Add variant (e.g. 08, S, XL)"
              className="portal-input flex-1"
            />
            <button onClick={addVariant} className="px-4 py-2 text-sm text-lime border border-white/10 hover:border-lime/50 transition-colors">
              Add
            </button>
          </div>
        </div>

        {/* Images */}
        <div className="bg-ink-surface border border-white/5 p-6">
          <h2 className="text-sm tracking-wider uppercase text-bone-muted mb-4">Images</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
              placeholder="Paste image URL"
              className="portal-input flex-1"
            />
            <button onClick={addImage} className="px-4 py-2 text-sm text-lime border border-white/10 hover:border-lime/50 transition-colors">
              Add
            </button>
          </div>
          {/* Upload area */}
          <div className="border border-dashed border-white/10 p-8 text-center mb-4">
            <Upload size={24} className="mx-auto text-bone-muted mb-2" />
            <p className="text-xs text-bone-muted">Drag and drop images here, or paste URL above</p>
          </div>
          {/* Image list with reordering */}
          {(product.images ?? []).length > 0 && (
            <div className="space-y-2">
              {(product.images ?? []).map((img, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-ink-raised p-2">
                  <GripVertical size={16} className="text-bone-muted/40" />
                  <div className="w-12 h-14 overflow-hidden bg-ink shrink-0">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                  <input
                    type="text"
                    value={img}
                    onChange={(e) => {
                      const imgs = [...(product.images ?? [])];
                      imgs[idx] = e.target.value;
                      update('images', imgs);
                    }}
                    className="flex-1 portal-input text-xs"
                  />
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveImage(idx, -1)} disabled={idx === 0} className="text-bone-muted hover:text-bone disabled:opacity-30 px-1.5 py-1 text-xs">↑</button>
                    <button onClick={() => moveImage(idx, 1)} disabled={idx === (product.images ?? []).length - 1} className="text-bone-muted hover:text-bone disabled:opacity-30 px-1.5 py-1 text-xs">↓</button>
                    <button onClick={() => removeImage(idx)} className="text-bone-muted hover:text-red-500 px-1.5 py-1">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <button
            onClick={() => handleSave(false)}
            className="flex-1 px-6 py-3 text-sm tracking-wider uppercase border border-white/10 text-bone hover:border-lime/50 transition-colors"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            className="flex-1 px-6 py-3 text-sm tracking-wider uppercase bg-lime text-ink font-medium hover:bg-lime-dark transition-colors"
          >
            Publish Product
          </button>
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 text-sm tracking-wider uppercase border border-white/10 text-bone-muted hover:text-bone transition-colors"
          >
            <Eye size={15} />
            Preview
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}
