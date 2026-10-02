import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authService, destinationForAccount } from '@/services/authService';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { loading, isAuthenticated, account, refreshAccount } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.');
      return;
    }

    const pendingSignIn = authService.consumePendingSignInAudit();

    const run = async () => {
      try {
        await refreshAccount();
        if (pendingSignIn) {
          try {
            const session = await authService.getSession();
            if (session) await authService.recordStaffSession('signed_in');
          } catch (err) {
            if (import.meta.env.DEV) console.error(err);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed.');
      }
    };
    void run();
  }, [refreshAccount]);

  useEffect(() => {
    if (loading) return;
    if (error) return;
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    navigate(destinationForAccount(account), { replace: true });
  }, [loading, isAuthenticated, account, error, navigate]);

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sm tracking-widest2 uppercase text-bone-muted font-mono">
          {error ?? 'Completing Discord sign-in...'}
        </p>
        {error && (
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="mt-6 text-xs tracking-wider uppercase text-lime hover:underline"
          >
            Back to login
          </button>
        )}
      </div>
    </div>
  );
}
