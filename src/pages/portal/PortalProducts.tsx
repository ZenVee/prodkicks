import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MoreVertical, Edit2, Copy, Archive, Trash2 } from 'lucide-react';
import type { Product, ProductCategory, ProductStatus } from '@/types';
import { productService } from '@/services/productService';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/common/Modal';
import { formatPrice, formatRelativeTime } from '@/utils/format';

const statusColors: Record<ProductStatus, string> = {
  published: 'text-lime',
  draft: 'text-bone-muted',
  archived: 'text-bone-muted/50 line-through',
};

const categoryFilters: { label: string; value: ProductCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Footwear', value: 'footwear' },
  { label: 'Tops', value: 'tops' },
  { label: 'Bottoms', value: 'bottoms' },
  { label: 'Accessories', value: 'accessories' },
];

const statusFilters: { label: string; value: ProductStatus | 'all' }[] = [
  { label: 'All Status', value: 'all' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

export default function PortalProducts() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [status, setStatus] = useState<ProductStatus | 'all'>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const load = () => {
    setLoading(true);
    productService.getAll().then((p) => {
      setProducts(p);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = [...products];
    if (category !== 'all') result = result.filter((p) => p.category === category);
    if (status !== 'all') result = result.filter((p) => p.status === status);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [products, category, status, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await productService.delete(deleteTarget.id);
    showToast(`${deleteTarget.name} deleted`, 'success');
    setDeleteTarget(null);
    load();
  };

  const handleDuplicate = async (id: string) => {
    const copy = await productService.duplicate(id);
    if (copy) showToast(`${copy.name} created`, 'success');
    load();
  };

  const handleArchive = async (product: Product) => {
    await productService.update(product.id, { status: 'archived' });
    showToast(`${product.name} archived`, 'info');
    load();
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone">Products</h1>
          <p className="text-sm text-bone-muted mt-1">{filtered.length} products</p>
        </div>
        <Link
          to="/portal/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-lime text-ink text-sm font-medium tracking-wider uppercase hover:bg-lime-dark transition-colors"
        >
          <Plus size={16} />
          Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-muted" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-ink-surface border border-white/10 text-bone placeholder:text-bone-muted focus:border-lime/50 focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
          className="px-3 py-2 text-sm bg-ink-surface border border-white/10 text-bone focus:border-lime/50 focus:outline-none"
        >
          {categoryFilters.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="px-3 py-2 text-sm bg-ink-surface border border-white/10 text-bone focus:border-lime/50 focus:outline-none"
        >
          {statusFilters.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Table - Desktop */}
      <div className="hidden lg:block bg-ink-surface border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Image</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Product</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">SKU</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Category</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Price</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Status</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Updated</th>
              <th className="text-right text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center text-sm text-bone-muted py-12">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-sm text-bone-muted py-12">No products found</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-ink-raised/50 transition-colors">
                <td className="px-4 py-2.5">
                  <div className="w-10 h-12 overflow-hidden bg-ink-raised">
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Link to={`/portal/products/${p.id}/edit`} className="text-sm text-bone hover:text-lime transition-colors">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-xs text-bone-muted font-mono">{p.sku}</td>
                <td className="px-4 py-2.5 text-xs text-bone-muted capitalize">{p.category}</td>
                <td className="px-4 py-2.5 text-sm text-lime">{formatPrice(p.price, p.currency)}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs capitalize ${statusColors[p.status]}`}>{p.status}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-bone-muted">{formatRelativeTime(p.updatedAt)}</td>
                <td className="px-4 py-2.5 text-right relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                    className="text-bone-muted hover:text-bone"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenu === p.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-4 top-full mt-1 w-40 bg-ink-surface border border-white/10 z-20 animate-slide-down text-left">
                        <Link to={`/portal/products/${p.id}/edit`} className="flex items-center gap-2 px-3 py-2 text-xs text-bone hover:bg-ink-raised hover:text-lime">
                          <Edit2 size={13} /> Edit
                        </Link>
                        <button onClick={() => handleDuplicate(p.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-bone hover:bg-ink-raised hover:text-lime">
                          <Copy size={13} /> Duplicate
                        </button>
                        <button onClick={() => handleArchive(p)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-bone hover:bg-ink-raised hover:text-lime">
                          <Archive size={13} /> Archive
                        </button>
                        <button onClick={() => { setDeleteTarget(p); setOpenMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-ink-raised">
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards - Mobile */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <p className="text-sm text-bone-muted text-center py-12">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-bone-muted text-center py-12">No products found</p>
        ) : filtered.map((p) => (
          <div key={p.id} className="bg-ink-surface border border-white/5 p-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-16 overflow-hidden bg-ink-raised shrink-0">
                <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/portal/products/${p.id}/edit`} className="text-sm text-bone hover:text-lime">{p.name}</Link>
                <p className="text-xs text-bone-muted mt-0.5">{p.sku} · {p.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-lime">{formatPrice(p.price, p.currency)}</span>
                  <span className={`text-xs capitalize ${statusColors[p.status]}`}>{p.status}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Product"
        onConfirm={handleDelete}
        confirmLabel="Delete"
      >
        <p className="text-sm text-bone-muted">
          Are you sure you want to delete <span className="text-bone">{deleteTarget?.name}</span>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
