import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Menu, X, LogOut, LayoutGrid, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setAvatarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const navLinks = [
    { to: '/', label: 'HOME' },
    { to: '/staff', label: 'STAFF' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-ink/90 backdrop-blur-md border-b border-white/5'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Left: Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-display text-lg lg:text-xl tracking-tight text-bone group-hover:text-lime transition-colors">
                PROD KICKS
              </span>
              <span className="text-lime text-xs font-mono mt-0.5">®</span>
            </Link>

            {/* Center: Nav */}
            <nav className="hidden md:flex items-center gap-8 lg:gap-12">
              {navLinks.map((link) => {
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="group relative"
                  >
                    <span
                      className={`text-xs lg:text-sm font-medium tracking-widest2 uppercase transition-colors ${
                        active ? 'text-lime' : 'text-bone hover:text-lime'
                      }`}
                    >
                      {link.label}
                    </span>
                    <span
                      className={`absolute -bottom-1 left-0 h-px bg-lime transition-all duration-300 ${
                        active ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

            {/* Right: Mobile menu + Staff Login */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="relative" ref={avatarRef}>
                  <button
                    onClick={() => setAvatarOpen(!avatarOpen)}
                    className="flex items-center gap-2 group"
                    aria-label="Employee menu"
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 lg:w-9 lg:h-9 rounded-full object-cover border border-white/10 group-hover:border-lime/50 transition-colors"
                    />
                    <span className="hidden lg:block text-xs text-bone-muted font-medium">
                      {user.name.split(' ')[0]}
                    </span>
                  </button>
                  {avatarOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-ink-surface border border-white/10 shadow-xl animate-slide-down">
                      <div className="p-3 border-b border-white/5">
                        <p className="text-sm text-bone font-medium">{user.name}</p>
                        <p className="text-xs text-bone-muted">{user.position}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/portal"
                          className="flex items-center gap-3 px-3 py-2.5 text-sm text-bone hover:bg-ink-raised hover:text-lime transition-colors"
                        >
                          <LayoutGrid size={15} />
                          Employee Portal
                        </Link>
                        <Link
                          to="/"
                          className="flex items-center gap-3 px-3 py-2.5 text-sm text-bone hover:bg-ink-raised hover:text-lime transition-colors"
                        >
                          <Eye size={15} />
                          View Website
                        </Link>
                        <button
                          onClick={() => logout()}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-bone hover:bg-ink-raised hover:text-lime transition-colors"
                        >
                          <LogOut size={15} />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 border border-white/10 hover:border-lime/50 hover:bg-lime/5 transition-all group"
                >
                  <DiscordIcon className="w-4 h-4 text-bone-muted group-hover:text-lime transition-colors" />
                  <span className="text-xs font-medium tracking-widest2 uppercase text-bone group-hover:text-lime transition-colors">
                    Staff Login
                  </span>
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-1.5 text-bone"
                aria-label="Menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden bg-ink/95 backdrop-blur-md animate-fade-in pt-20">
          <nav className="flex flex-col px-6 py-8 gap-1">
            {navLinks.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-2xl font-display tracking-tight py-4 border-b border-white/5 transition-colors ${
                    active ? 'text-lime' : 'text-bone'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {!user && (
              <Link
                to="/login"
                className="flex items-center gap-3 mt-8 px-4 py-3 border border-white/10"
              >
                <DiscordIcon className="w-5 h-5 text-bone-muted" />
                <span className="text-sm font-medium tracking-widest2 uppercase text-bone">
                  Staff Login
                </span>
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

function DiscordIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.369a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}
