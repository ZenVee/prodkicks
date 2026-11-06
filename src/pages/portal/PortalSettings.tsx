import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import type { ProductCategoryDef, ProductCategoryIcon, SiteSettings } from '@/types';
import { settingsService } from '@/services/settingsService';
import { useToast } from '@/hooks/useToast';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { formatPrice, slugify } from '@/utils/format';
import CategoryIconPicker from '@/components/products/CategoryIconPicker';

const TABS = [
  { id: 'brand', label: 'Brand' },
  { id: 'seo', label: 'SEO' },
  { id: 'categories', label: 'Categories' },
  { id: 'sales', label: 'Sales' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function PortalSettings() {
  const { showToast } = useToast();
  const { refreshSettings } = useSiteSettings();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabId>('brand');

  useEffect(() => {
    settingsService.getSettings().then(setSettings);
  }, []);

  const commissionExample = useMemo(() => {
    const pct = settings?.commissionPercentage ?? 0;
    const sample = 200;
    return {
      sample,
      amount: Math.round(sample * (pct / 100) * 100) / 100,
    };
  }, [settings?.commissionPercentage]);

  if (!settings) {
    return <p className="text-sm text-bone-muted py-12 text-center">Loading settings…</p>;
  }

  const update = <K extends keyof SiteSettings>(field: K, value: SiteSettings[K]) => {
    setSettings((prev) => ({ ...prev!, [field]: value }));
  };

  const categories = settings.productCategories;

  const updateCategory = (id: string, patch: Partial<ProductCategoryDef>) => {
    update(
      'productCategories',
      categories.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c, ...patch };
        if (patch.label !== undefined && patch.slug === undefined) {
          next.slug = slugify(patch.label);
        }
        if (patch.slug !== undefined) {
          next.slug = slugify(patch.slug);
        }
        return next;
      }),
    );
  };

  const addCategory = () => {
    const id = `cat_${Date.now()}`;
    update('productCategories', [
      ...categories,
      { id, slug: '', label: '', icon: 'tag' as ProductCategoryIcon },
    ]);
  };

  const removeCategory = (id: string) => {
    if (categories.length <= 1) {
      showToast('Keep at least one category', 'error');
      return;
    }
    update(
      'productCategories',
      categories.filter((c) => c.id !== id),
    );
  };

  const moveCategory = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[idx], next[target]] = [next[target], next[idx]];
    update('productCategories', next);
  };

  const handleSave = async () => {
    const cleaned = categories
      .map((c) => ({
        ...c,
        label: c.label.trim(),
        slug: slugify(c.slug || c.label),
      }))
      .filter((c) => c.label && c.slug);

    if (cleaned.length === 0) {
      showToast('Add at least one product category', 'error');
      return;
    }

    const slugs = cleaned.map((c) => c.slug);
    if (new Set(slugs).size !== slugs.length) {
      showToast('Category slugs must be unique', 'error');
      return;
    }

    setSaving(true);
    try {
      const saved = await settingsService.updateSettings({
        ...settings,
        productCategories: cleaned,
      });
      setSettings(saved);
      await refreshSettings();
      showToast('Settings saved', 'success');
    } catch {
      showToast('Could not save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="max-w-3xl mx-auto pb-24 sm:pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone">Settings</h1>
          <p className="text-sm text-bone-muted mt-1">Brand, shop catalog, and sales defaults.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="hidden sm:inline-flex px-5 py-2.5 text-xs tracking-wider uppercase bg-lime text-ink font-medium hover:bg-lime-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div
        className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/10 mb-6"
        role="tablist"
        aria-label="Settings sections"
      >
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`settings-tab-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`shrink-0 px-4 py-3 text-xs tracking-wider uppercase transition-colors border-b-2 -mb-px ${
                selected
                  ? 'text-lime border-lime'
                  : 'text-bone-muted border-transparent hover:text-bone'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        aria-labelledby={`settings-tab-${tab}`}
        className="bg-ink-surface border border-white/5 p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-sm tracking-wider uppercase text-bone">{active.label}</h2>
            <p className="text-xs text-bone-muted mt-1">
              {tab === 'brand' && 'How your store presents itself across the site'}
              {tab === 'seo' && 'Defaults for search engines and browser tabs'}
              {tab === 'categories' && 'Controls filters and the category picker on products'}
              {tab === 'sales' && 'Used when logging sales in the portal'}
            </p>
          </div>
          {tab === 'categories' ? (
            <button
              type="button"
              onClick={addCategory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-wider uppercase border border-white/10 text-lime hover:border-lime/50 transition-colors"
            >
              <Plus size={14} />
              Add
            </button>
          ) : null}
        </div>

        {tab === 'brand' ? (
          <>
            <div className="mb-5 border border-white/5 bg-ink/40 px-4 py-4">
              <p className="font-display text-2xl tracking-tighter text-bone">
                {settings.companyName || 'Company name'}
              </p>
              <p className="text-sm text-bone-muted mt-1">
                {settings.tagline || 'Add a short tagline'}
                {settings.establishedYear ? ` · Est. ${settings.establishedYear}` : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company name">
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => update('companyName', e.target.value)}
                  className="portal-input"
                  placeholder="Prod Kicks"
                />
              </Field>
              <Field label="Tagline">
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => update('tagline', e.target.value)}
                  className="portal-input"
                  placeholder="Footwear / Apparel / Culture"
                />
              </Field>
              <Field label="Established">
                <input
                  type="text"
                  value={settings.establishedYear}
                  onChange={(e) => update('establishedYear', e.target.value)}
                  className="portal-input"
                  placeholder="2026"
                />
              </Field>
              <Field label="Currency">
                <input
                  type="text"
                  value={settings.currencySymbol}
                  onChange={(e) => update('currencySymbol', e.target.value)}
                  className="portal-input"
                  placeholder="$"
                  maxLength={4}
                />
              </Field>
            </div>

            <Field label="Footer text" className="mt-4">
              <textarea
                value={settings.footerText}
                onChange={(e) => update('footerText', e.target.value)}
                rows={2}
                className="portal-input resize-y"
                placeholder="Short line shown in the site footer"
              />
            </Field>
          </>
        ) : null}

        {tab === 'seo' ? (
          <>
            <Field label="Default page title">
              <input
                type="text"
                value={settings.seoTitle}
                onChange={(e) => update('seoTitle', e.target.value)}
                className="portal-input"
                placeholder="PROD KICKS — Footwear / Apparel / Culture"
              />
            </Field>
            <Field label="Meta description" className="mt-4">
              <textarea
                value={settings.seoDescription}
                onChange={(e) => update('seoDescription', e.target.value)}
                rows={3}
                className="portal-input resize-y"
                placeholder="A short description for search results"
              />
              <p className="mt-1.5 text-[11px] text-bone-muted">
                Aim for about 150–160 characters
                {settings.seoDescription ? ` · ${settings.seoDescription.length}` : ''}
              </p>
            </Field>
          </>
        ) : null}

        {tab === 'categories' ? (
          <div className="space-y-3">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="border border-white/5 bg-ink/30 p-4">
                <div className="flex items-start gap-3">
                  <Field label="Icon" className="shrink-0">
                    <CategoryIconPicker
                      value={cat.icon || 'tag'}
                      onChange={(icon) => updateCategory(cat.id, { icon })}
                      ariaLabel={`${cat.label || 'Category'} icon`}
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-w-0">
                    <Field label="Label">
                      <input
                        type="text"
                        value={cat.label}
                        onChange={(e) => updateCategory(cat.id, { label: e.target.value })}
                        placeholder="e.g. Hats"
                        className="portal-input"
                      />
                    </Field>
                    <Field label="Slug">
                      <input
                        type="text"
                        value={cat.slug}
                        onChange={(e) => updateCategory(cat.id, { slug: e.target.value })}
                        placeholder="hats"
                        className="portal-input font-mono text-xs"
                      />
                    </Field>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0 pt-5">
                    <button
                      type="button"
                      onClick={() => moveCategory(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 text-bone-muted hover:text-bone disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCategory(idx, 1)}
                      disabled={idx === categories.length - 1}
                      className="p-1.5 text-bone-muted hover:text-bone disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCategory(cat.id)}
                      className="p-1.5 text-bone-muted hover:text-red-500"
                      aria-label="Remove category"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'sales' ? (
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,220px)_1fr] gap-4 items-start">
            <Field label="Commission rate">
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={settings.commissionPercentage}
                  onChange={(e) => update('commissionPercentage', Number(e.target.value) || 0)}
                  className="portal-input pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-bone-muted">%</span>
              </div>
            </Field>
            <div className="border border-white/5 bg-ink/40 px-4 py-3 sm:mt-6">
              <p className="text-[10px] tracking-wider uppercase text-bone-muted mb-1">Example</p>
              <p className="text-sm text-bone">
                {formatPrice(commissionExample.sample, settings.currencySymbol)} sale →{' '}
                <span className="text-lime">
                  {formatPrice(commissionExample.amount, settings.currencySymbol)}
                </span>{' '}
                commission
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="sm:hidden fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink/95 backdrop-blur px-4 py-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-3 text-xs tracking-wider uppercase bg-lime text-ink font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
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
