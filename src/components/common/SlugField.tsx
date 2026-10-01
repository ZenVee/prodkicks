import { useState } from 'react';
import { Pencil, Lock } from 'lucide-react';
import { slugify } from '@/utils/format';

interface SlugFieldProps {
  value: string;
  onChange: (slug: string) => void;
  /** When true, parent should stop auto-updating from title/name */
  onLockChange?: (locked: boolean) => void;
  className?: string;
  label?: string;
}

export default function SlugField({
  value,
  onChange,
  onLockChange,
  className = '',
  label = 'Slug',
}: SlugFieldProps) {
  const [locked, setLocked] = useState(true);

  const unlock = () => {
    setLocked(false);
    onLockChange?.(false);
  };

  const lock = () => {
    setLocked(true);
    onLockChange?.(true);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs tracking-wider uppercase text-bone-muted">{label}</label>
        {locked ? (
          <button
            type="button"
            onClick={unlock}
            className="inline-flex items-center gap-1 text-[10px] tracking-wider uppercase text-bone-muted hover:text-lime transition-colors"
          >
            <Pencil size={11} />
            Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={lock}
            className="inline-flex items-center gap-1 text-[10px] tracking-wider uppercase text-lime hover:text-lime-dark transition-colors"
          >
            <Lock size={11} />
            Lock
          </button>
        )}
      </div>
      <input
        type="text"
        value={value}
        readOnly={locked}
        disabled={locked}
        onChange={(e) => onChange(slugify(e.target.value))}
        className={`portal-input font-mono text-xs ${
          locked ? 'opacity-50 cursor-not-allowed bg-ink/40' : ''
        }`}
        aria-readonly={locked}
      />
      {locked ? (
        <p className="mt-1 text-[10px] text-bone-muted">Auto-generated — click Edit to customize</p>
      ) : null}
    </div>
  );
}
