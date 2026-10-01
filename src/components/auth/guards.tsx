import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { Permission } from '@/types';

function AuthLoading() {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <p className="text-sm tracking-widest2 uppercase text-bone-muted font-mono">Loading...</p>
    </div>
  );
}

export function RequireAuth() {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function RequireApproved() {
  const { loading, isAuthenticated, isApproved, account } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!account || account.status == null) {
    return <Navigate to="/profile-setup" replace />;
  }
  if (!isApproved) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export function RequirePermission({ permission }: { permission: Permission }) {
  const { loading, hasPermission } = useAuth();

  if (loading) return <AuthLoading />;
  if (!hasPermission(permission)) {
    return <Navigate to="/portal" replace />;
  }
  return <Outlet />;
}
