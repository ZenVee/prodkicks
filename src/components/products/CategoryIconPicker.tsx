import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { ProductCategoryIcon } from '@/types';
import { PRODUCT_CATEGORY_ICONS } from '@/data/productCategories';
import CategoryIcon from '@/components/products/CategoryIcon';

const GROUP_LABELS: Record<string, string> = {
  apparel: 'Apparel',
  footwear: 'Footwear',
  accessories: 'Accessories',
  general: 'General',
};

export default function CategoryIconPicker({
  value,
  onChange,
  ariaLabel = 'Choose icon',
}: {
  value: ProductCategoryIcon;
  onChange: (icon: ProductCategoryIcon) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PRODUCT_CATEGORY_ICONS;
    return PRODUCT_CATEGORY_ICONS.filter((opt) => {
      const hay = [opt.label, opt.value, opt.group, ...opt.keywords].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const opt of filtered) {
      const list = map.get(opt.group) ?? [];
      list.push(opt);
      map.set(opt.group, list);
    }
    return ['apparel', 'footwear', 'accessories', 'general']
      .map((group) => ({ group, items: map.get(group) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center justify-center w-10 h-10 border transition-colors ${
          open
            ? 'border-lime bg-lime/10 text-lime'
            : 'border-white/10 text-bone hover:border-white/25'
        }`}
      >
        <CategoryIcon name={value || 'tag'} size={16} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Icon library"
          className="absolute left-0 top-full z-30 mt-2 w-[min(100vw-2rem,20rem)] border border-white/10 bg-ink-surface shadow-xl p-3"
        >
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-muted" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons…"
              className="portal-input pl-9 text-xs"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-3 pr-0.5">
            {grouped.length === 0 ? (
              <p className="text-xs text-bone-muted py-6 text-center">No icons match</p>
            ) : (
              grouped.map(({ group, items }) => (
                <div key={group}>
                  <p className="text-[10px] tracking-wider uppercase text-bone-muted mb-1.5 px-0.5">
                    {GROUP_LABELS[group] ?? group}
                  </p>
                  <div className="grid grid-cols-6 gap-1">
                    {items.map((opt) => {
                      const selected = value === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          title={opt.label}
                          aria-label={opt.label}
                          aria-pressed={selected}
                          onClick={() => {
                            onChange(opt.value);
                            setOpen(false);
                            setQuery('');
                          }}
                          className={`inline-flex items-center justify-center aspect-square border transition-colors ${
                            selected
                              ? 'border-lime bg-lime/10 text-lime'
                              : 'border-white/10 text-bone-muted hover:border-white/25 hover:text-bone'
                          }`}
                        >
                          <CategoryIcon name={opt.value} size={15} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
