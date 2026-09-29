import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-ink-surface border border-white/10 w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-sm font-medium tracking-wider uppercase text-bone">{title}</h3>
          <button onClick={onClose} className="text-bone-muted hover:text-bone">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
        {onConfirm && (
          <div className="flex items-center justify-end gap-3 p-5 border-t border-white/5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs tracking-wider uppercase text-bone-muted hover:text-bone transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className="px-4 py-2 text-xs tracking-wider uppercase bg-lime text-ink font-medium hover:bg-lime-dark transition-colors"
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
