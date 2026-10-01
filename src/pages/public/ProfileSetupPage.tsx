import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { mapSupabaseError } from '@/utils/errors';

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { loading, isAuthenticated, account, refreshAccount, signOut } = useAuth();
  const [fullName, setFullName] = useState('');
  const [stateId, setStateId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (account?.status != null) {
      navigate(account.status === 'approved' ? '/portal' : '/', { replace: true });
    }
  }, [loading, isAuthenticated, account, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authService.submitProfile(fullName, stateId);
      await refreshAccount();
      navigate('/', { replace: true });
    } catch (err) {
      setError(mapSupabaseError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !isAuthenticated || account?.status != null) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <p className="text-sm tracking-widest2 uppercase text-bone-muted font-mono">Loading...</p>
      </div>
    );
  }

  const avatar = account?.discordAvatarUrl ?? '';
  const username = account?.discordUsername ?? 'Discord user';

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-ink">
      <div className="absolute inset-0 bg-ink" />
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-ink-surface/90 backdrop-blur-md border border-white/10 p-8 lg:p-12 animate-scale-in">
          <div className="text-center mb-8">
            <span className="font-display text-2xl tracking-tight text-bone">PROD KICKS</span>
            <p className="mt-3 text-xs tracking-widest2 uppercase text-bone-muted">Complete your profile</p>
          </div>

          <div className="flex items-center gap-3 p-3 bg-ink-raised border border-white/5 mb-6">
            {avatar ? (
              <img src={avatar} alt={username} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-ink border border-white/10" />
            )}
            <div>
              <p className="text-sm text-bone font-medium">{username}</p>
              <p className="text-[10px] tracking-widest2 uppercase text-bone-muted">Discord account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Full Name</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="portal-input"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">State ID</label>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]+"
                value={stateId}
                onChange={(e) => setStateId(e.target.value.replace(/\D/g, ''))}
                className="portal-input"
                placeholder="Digits only"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-4 bg-lime text-ink font-medium text-sm tracking-wider uppercase hover:bg-lime-dark transition-colors disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Request Access'}
            </button>
          </form>

          <button
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className="w-full mt-4 text-xs tracking-wider uppercase text-bone-muted hover:text-lime transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
