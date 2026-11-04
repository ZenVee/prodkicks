import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Permission, StaffAccount, User } from '@/types';
import { authService, toAuthUser } from '@/services/authService';
import { isSupabaseConfigured } from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
  account: StaffAccount | null;
  roleKey: string | null;
  roleId: string | null;
  permissions: Permission[];
  loading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  isDeveloper: boolean;
  hasPermission: (permission: Permission | string) => boolean;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<StaffAccount | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAccount = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.user) {
      setAccount(null);
      setPermissions([]);
      setIsDeveloper(false);
      return;
    }

    const staffAccount = await authService.getStaffAccount(nextSession.user.id);
    if (!staffAccount) {
      setAccount(null);
      setPermissions([]);
      setIsDeveloper(false);
      return;
    }

    const access = await authService.getEffectiveAccess(staffAccount);
    setAccount(access.account);
    setPermissions(access.permissions);
    setIsDeveloper(access.isDeveloper);
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const current = await authService.getSession();
    setSession(current);
    await loadAccount(current);
  }, [loadAccount]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let unsubscribeAccount: (() => void) | undefined;

    const attachAccountSubscription = (userId: string | undefined) => {
      unsubscribeAccount?.();
      unsubscribeAccount = undefined;
      if (!userId) return;
      unsubscribeAccount = authService.subscribeStaffAccount(userId, () => {
        void refreshAccount();
      });
    };

    const bootstrap = async () => {
      try {
        const current = await authService.getSession();
        if (!mounted) return;
        setSession(current);
        await loadAccount(current);
        attachAccountSubscription(current?.user?.id);
      } catch (err) {
        if (import.meta.env.DEV) console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void bootstrap();

    const unsubscribeAuth = authService.onAuthStateChange(async (_event, next) => {
      if (!mounted) return;
      setSession(next);
      try {
        await loadAccount(next);
        attachAccountSubscription(next?.user?.id);
      } catch (err) {
        if (import.meta.env.DEV) console.error(err);
      }
    });

    return () => {
      mounted = false;
      unsubscribeAuth();
      unsubscribeAccount?.();
    };
  }, [loadAccount, refreshAccount]);

  const user = useMemo(() => {
    if (!session?.user) return null;
    return toAuthUser(session.user, account);
  }, [session, account]);

  const roleKey = account?.roleKey ?? null;
  const roleId = account?.roleId ?? null;
  const isAuthenticated = Boolean(session?.user);
  const isApproved = account?.status === 'approved';

  const hasPermission = useCallback(
    (permission: Permission | string) => {
      if (!isApproved) return false;
      if (isDeveloper || roleKey === 'developer') return true;
      if (!roleKey && permissions.length === 0) return false;
      return permissions.includes(permission as Permission);
    },
    [isApproved, isDeveloper, roleKey, permissions]
  );

  const signInWithDiscord = useCallback(async () => {
    await authService.signInWithDiscord();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authService.recordStaffSession('signed_out');
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
    }
    await authService.signOut();
    setSession(null);
    setAccount(null);
    setPermissions([]);
    setIsDeveloper(false);
  }, []);

  const value: AuthContextValue = {
    user,
    account,
    roleKey,
    roleId,
    permissions,
    loading,
    isAuthenticated,
    isApproved,
    isDeveloper: isDeveloper || roleKey === 'developer',
    hasPermission,
    signInWithDiscord,
    signOut,
    refreshAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
