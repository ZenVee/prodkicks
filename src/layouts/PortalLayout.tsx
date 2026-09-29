import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Package,
  FolderOpen,
  Calendar,
  Users,
  Home,
  Settings,
  Eye,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { to: '/portal', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/portal/products', label: 'Products', icon: Package, end: false },
  { to: '/portal/collections', label: 'Collections', icon: FolderOpen, end: false },
  { to: '/portal/drops', label: 'Drops', icon: Calendar, end: false },
  { to: '/portal/team', label: 'Team', icon: Users, end: false },
  { to: '/portal/homepage', label: 'Homepage', icon: Home, end: false },
  { to: '/portal/settings', label: 'Settings', icon: Settings, end: false },
];

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-ink flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-ink-surface border-r border-white/5 fixed inset-y-0 left-0 z-30">
        <SidebarContent user={user} onLogout={handleLogout} />
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-ink-surface border-r border-white/5 lg:hidden animate-slide-right">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-bone-muted hover:text-bone"
            >
              <X size={20} />
            </button>
            <SidebarContent user={user} onLogout={handleLogout} />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-ink/90 backdrop-blur-md border-b border-white/5 h-14 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-bone-muted hover:text-bone"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <span className="text-xs tracking-widest2 uppercase text-bone-muted font-mono hidden sm:block">
              Employee Portal
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-bone font-medium">{user.name}</p>
                <p className="text-[10px] text-bone-muted capitalize">{user.role}</p>
              </div>
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-white/10"
              />
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ user, onLogout }: { user: ReturnType<typeof useAuth>['user']; onLogout: () => void }) {
  return (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <Link to="/" className="inline-flex items-baseline gap-1.5">
          <span className="font-display text-lg tracking-tight text-bone">PROD KICKS</span>
          <span className="text-lime text-[10px] font-mono">®</span>
        </Link>
        <p className="text-[10px] tracking-widest2 uppercase text-bone-muted mt-1">Employee Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-lime/10 text-lime border-l-2 border-lime'
                  : 'text-bone-muted hover:text-bone hover:bg-ink-raised border-l-2 border-transparent'
              }`
            }
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-bone-muted hover:text-bone hover:bg-ink-raised transition-colors"
        >
          <Eye size={16} />
          View Website
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-bone-muted hover:text-bone hover:bg-ink-raised transition-colors"
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </>
  );
}
