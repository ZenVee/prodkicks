import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, Eye, X } from 'lucide-react';
import type { HomepageContent, HomepageSection, Collection, Drop, Product } from '@/types';
import { settingsService } from '@/services/settingsService';
import { collectionService } from '@/services/collectionService';
import { dropService } from '@/services/dropService';
import { productService } from '@/services/productService';
import { useToast } from '@/hooks/useToast';
import { mapSupabaseError } from '@/utils/errors';

const sectionTypeLabels: Record<string, string> = {
  'hero': 'Hero',
  'shop': 'Shop',
  'featured-collection': 'Featured Collection',
  'promotional-banner': 'Promotional Banner',
};

export default function PortalHomepage() {
  const { showToast } = useToast();
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [editing, setEditing] = useState<HomepageSection | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    Promise.all([
      settingsService.getHomepageContent(),
      collectionService.getAll(),
      dropService.getAll(),
      productService.getAll(),
    ]).then(([c, cols, drs, prods]) => {
      setContent(c);
      setCollections(cols);
      setDrops(drs);
      setProducts(prods);
    });
  }, []);

  if (!content) return <p className="text-sm text-bone-muted">Loading...</p>;

  const sorted = [...content.sections].sort((a, b) => a.displayOrder - b.displayOrder);

  const toggleEnabled = (id: string) => {
    const sections = content.sections.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setContent({ sections });
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    const sortedSections = [...content.sections].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sortedSections.findIndex((s) => s.id === id);
    const target = idx + dir;
    if (target < 0 || target >= sortedSections.length) return;
    const swap = sortedSections[target];
    const sections = content.sections.map((s) => {
      if (s.id === id) return { ...s, displayOrder: swap.displayOrder };
      if (s.id === swap.id) return { ...s, displayOrder: sortedSections[idx].displayOrder };
      return s;
    });
    setContent({ sections });
  };

  const saveSection = async (updated: HomepageSection) => {
    const sections = content.sections.map((s) => (s.id === updated.id ? updated : s));
    const next = { sections };
    setContent(next);
    setEditing(null);
    try {
      await settingsService.updateHomepageContent(next);
      showToast('Homepage section saved', 'success');
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    }
  };

  const handleSave = async () => {
    try {
      await settingsService.updateHomepageContent(content);
      showToast('Homepage saved', 'success');
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone">Homepage Manager</h1>
          <p className="text-sm text-bone-muted mt-1">Configure homepage sections and content</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm tracking-wider uppercase border border-white/10 text-bone hover:border-lime/50 transition-colors"
          >
            <Eye size={15} />
            Preview Website
          </Link>
          <button
            onClick={handleSave}
            className="px-4 py-2.5 bg-lime text-ink text-sm font-medium tracking-wider uppercase hover:bg-lime-dark transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* Sections list */}
      <div className="space-y-3">
        {sorted.map((section, idx) => (
          <div
            key={section.id}
            className={`bg-ink-surface border p-4 transition-colors ${
              section.enabled ? 'border-white/5' : 'border-white/5 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveSection(section.id, -1)} disabled={idx === 0} className="text-bone-muted hover:text-bone disabled:opacity-30">
                  <ArrowUp size={15} />
                </button>
                <button onClick={() => moveSection(section.id, 1)} disabled={idx === sorted.length - 1} className="text-bone-muted hover:text-bone disabled:opacity-30">
                  <ArrowDown size={15} />
                </button>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tracking-widest2 uppercase text-bone-muted/50 font-mono">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-sm font-medium text-bone">{section.title}</h3>
                </div>
                <p className="text-xs text-bone-muted mt-0.5">
                  {sectionTypeLabels[section.type]}
                  {section.config.featuredCollectionId && ' · Collection selected'}
                  {((section.config.featuredDropIds?.length ?? 0) > 0 || section.config.featuredDropId) &&
                    ` · ${(section.config.featuredDropIds?.length ?? (section.config.featuredDropId ? 1 : 0))} drop(s)`}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={section.enabled}
                  onChange={() => toggleEnabled(section.id)}
                  className="accent-lime w-4 h-4"
                />
                <span className="text-xs text-bone-muted">Enabled</span>
              </label>
              <button
                onClick={() => setEditing(section)}
                className="px-3 py-1.5 text-xs tracking-wider uppercase border border-white/10 text-bone hover:border-lime/50 transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <SectionEditModal
          section={editing}
          collections={collections}
          drops={drops}
          products={products}
          onClose={() => setEditing(null)}
          onSave={saveSection}
        />
      )}
    </div>
  );
}

function SectionEditModal({
  section,
  collections,
  drops,
  products,
  onClose,
  onSave,
}: {
  section: HomepageSection;
  collections: Collection[];
  drops: Drop[];
  products: Product[];
  onClose: () => void;
  onSave: (section: HomepageSection) => void | Promise<void>;
}) {
  const [config, setConfig] = useState(section.config);
  const [saving, setSaving] = useState(false);

  const update = (key: string, value: string | string[] | undefined) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...section, config });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-ink-surface border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-ink-surface z-10">
          <h3 className="text-sm font-medium tracking-wider uppercase text-bone">Edit {section.title}</h3>
          <button onClick={onClose} className="text-bone-muted hover:text-bone"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {section.type === 'hero' && (
            <>
              <div>
                <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">
                  Hero Content Mode
                </label>
                <select
                  value={config.heroMode ?? 'articles_first'}
                  onChange={(e) =>
                    update('heroMode', e.target.value as NonNullable<typeof config.heroMode>)
                  }
                  className="portal-input"
                >
                  <option value="articles_first">Articles first, then drops</option>
                  <option value="mixed">Mix featured articles & drops</option>
                  <option value="featured_articles">Featured articles only</option>
                  <option value="drops">Drops only</option>
                </select>
                <p className="text-xs text-bone-muted mt-1.5">
                  Controls how magazine articles and drops share the homepage hero.
                </p>
              </div>
              <div>
                <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Hero Drops</label>
                <p className="text-xs text-bone-muted mb-2">Select one or more drops. Order follows selection order.</p>
                <div className="max-h-48 overflow-y-auto space-y-1 border border-white/10 p-2">
                  {drops.map((d) => {
                    const selected = config.featuredDropIds?.length
                      ? config.featuredDropIds.includes(d.id)
                      : config.featuredDropId === d.id;
                    return (
                      <label key={d.id} className="flex items-center gap-2 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            const current =
                              config.featuredDropIds?.length
                                ? [...config.featuredDropIds]
                                : config.featuredDropId
                                  ? [config.featuredDropId]
                                  : [];
                            const next = e.target.checked
                              ? [...current, d.id]
                              : current.filter((id) => id !== d.id);
                            setConfig((prev) => ({
                              ...prev,
                              featuredDropIds: next,
                              featuredDropId: next[0],
                            }));
                          }}
                          className="accent-lime w-4 h-4"
                        />
                        <span className="text-xs text-bone">{d.name} (Drop {d.dropNumber})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">
                  Hero Image Override (first drop slide)
                </label>
                <input
                  type="text"
                  value={config.heroImage ?? ''}
                  onChange={(e) => update('heroImage', e.target.value)}
                  className="portal-input"
                  placeholder="Optional — uses drop image by default"
                />
              </div>
            </>
          )}
          {section.type === 'featured-collection' && (
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Featured Collection</label>
              <select
                value={config.featuredCollectionId ?? ''}
                onChange={(e) => update('featuredCollectionId', e.target.value || undefined)}
                className="portal-input"
              >
                <option value="">Select collection</option>
                {collections.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {section.type === 'shop' && (
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Featured Products (optional)</label>
              <p className="text-xs text-bone-muted mt-1">
                Selected products appear first. All other published products still show after them.
              </p>
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1 border border-white/10 p-2">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={(config.featuredProductIds ?? []).includes(p.id)}
                      onChange={(e) => {
                        const current = config.featuredProductIds ?? [];
                        update('featuredProductIds', e.target.checked ? [...current, p.id] : current.filter((id) => id !== p.id));
                      }}
                      className="accent-lime w-4 h-4"
                    />
                    <span className="text-xs text-bone">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {section.type === 'promotional-banner' && (
            <>
              <div>
                <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Banner Text</label>
                <input type="text" value={config.bannerText ?? ''} onChange={(e) => update('bannerText', e.target.value)} className="portal-input" />
              </div>
              <div>
                <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Banner Image URL</label>
                <input type="text" value={config.bannerImage ?? ''} onChange={(e) => update('bannerImage', e.target.value)} className="portal-input" />
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-white/5 sticky bottom-0 bg-ink-surface">
          <button onClick={onClose} className="px-4 py-2 text-xs tracking-wider uppercase text-bone-muted hover:text-bone">Cancel</button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-4 py-2 text-xs tracking-wider uppercase bg-lime text-ink font-medium hover:bg-lime-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
