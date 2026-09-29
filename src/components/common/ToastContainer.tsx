import { useToast } from '@/hooks/useToast';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'error' ? AlertCircle : Info;
        const color = toast.type === 'success' ? 'text-lime' : toast.type === 'error' ? 'text-red-500' : 'text-bone';
        return (
          <div
            key={toast.id}
            className="flex items-start gap-3 bg-ink-surface border border-white/10 px-4 py-3 shadow-xl animate-slide-right"
          >
            <Icon size={18} className={color + ' mt-0.5 shrink-0'} />
            <p className="text-sm text-bone flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="text-bone-muted hover:text-bone">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
