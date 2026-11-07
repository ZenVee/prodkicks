import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
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
  ShieldCheck,
  KeyRound,
  ScrollText,
  Newspaper,
  CircleDollarSign,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Permission } from '@/types';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  end?: boolean;
  permission?: Permission;
  anyPermission?: Permission[];
};

type NavSection = {
  id: string;
  label?: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    id: 'home',
    items: [{ to: '/portal', label: 'Overview', icon: LayoutGrid, end: true }],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    items: [
      { to: '/portal/products', label: 'Products', icon: Package, permission: 'products.view' },
      { to: '/portal/collections', label: 'Collections', icon: FolderOpen, permission: 'collections.view' },
      { to: '/portal/drops', label: 'Drops', icon: Calendar, permission: 'drops.view' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { to: '/portal/magazine', label: 'Magazine', icon: Newspaper, permission: 'magazine.view' },
      { to: '/portal/homepage', label: 'Homepage', icon: Home, permission: 'homepage.edit' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { to: '/portal/sales', label: 'Sales', icon: CircleDollarSign, anyPermission: ['sales.view', 'sales.create'] },
      { to: '/portal/team', label: 'Team', icon: Users, anyPermission: ['team.view', 'accounts.view'] },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { to: '/portal/access', label: 'Access', icon: ShieldCheck, permission: 'accounts.view' },
      { to: '/portal/permissions', label: 'Permissions', icon: KeyRound, permission: 'permissions.view' },
      { to: '/portal/audit', label: 'Audit', icon: ScrollText, permission: 'audit.view' },
      { to: '/portal/settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
    ],
  },
];

function itemVisible(
  item: NavItem,
  hasPermission: (p: Permission | string) => boolean,
  isDeveloper: boolean
): boolean {
  if (isDeveloper) return true;
  if (item.anyPermission) return item.anyPermission.some((p) => hasPermission(p));
  if (item.permission) return hasPermission(item.permission);
  return true;
}

export default function PortalLayout() {
  const { user, signOut, hasPermission, isDeveloper } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const visibleSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => itemVisible(item, hasPermission, isDeveloper)),
        }))
        .filter((section) => section.items.length > 0),
    [hasPermission, isDeveloper]
  );

  return (
    <div className="min-h-screen bg-ink flex">
      <aside className="hidden lg:flex flex-col w-60 bg-ink-surface border-r border-white/5 fixed inset-y-0 left-0 z-30">
        <SidebarContent user={user} onLogout={handleLogout} sections={visibleSections} />
      </aside>

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
            <SidebarContent user={user} onLogout={handleLogout} sections={visibleSections} />
          </aside>
        </>
      )}

      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
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
                <p className="text-[10px] text-bone-muted capitalize">{user.roleLabel}</p>
              </div>
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border border-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full border border-white/10 bg-ink-raised" />
              )}
            </div>
          )}
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  user,
  onLogout,
  sections,
}: {
  user: ReturnType<typeof useAuth>['user'];
  onLogout: () => void;
  sections: NavSection[];
}) {
  return (
    <>
      <div className="p-5 border-b border-white/5">
        <Link to="/" className="inline-flex items-baseline gap-1.5">
          <span className="font-display text-lg tracking-tight text-bone">PROD KICKS</span>
        </Link>
        <p className="text-[10px] tracking-widest2 uppercase text-bone-muted mt-1">Employee Portal</p>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto space-y-5">
        {sections.map((section) => (
          <div key={section.id}>
            {section.label && (
              <p className="px-3 mb-1.5 text-[10px] tracking-widest2 uppercase text-bone-muted/70">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
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
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5 space-y-1">
        {user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-bone truncate">{user.name}</p>
            <p className="text-[10px] text-bone-muted capitalize">{user.roleLabel}</p>
          </div>
        )}
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
