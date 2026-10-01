import { Link } from 'react-router-dom';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export default function Footer() {
  const { settings } = useSiteSettings();
  const brand = settings.companyName || 'PROD KICKS';
  const year = settings.establishedYear || '2026';

  return (
    <footer className="relative bg-ink-surface border-t border-white/5 overflow-hidden">
      <div className="absolute -bottom-6 sm:-bottom-10 lg:-bottom-16 left-0 right-0 pointer-events-none select-none overflow-hidden">
        <p className="font-display text-[18vw] leading-none text-white/[0.025] whitespace-nowrap tracking-tighter">
          {brand.toUpperCase()}
        </p>
      </div>

      <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-16 lg:pt-24 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16">
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-baseline gap-1.5">
              <span className="font-display text-2xl lg:text-3xl tracking-tight text-bone">
                {brand.toUpperCase()}
              </span>
            </Link>
            <p className="mt-4 text-xs tracking-widest2 uppercase text-bone-muted">
              {settings.tagline}
            </p>
            <p className="mt-6 max-w-md text-sm text-bone-muted leading-relaxed">
              {settings.footerText}
            </p>
          </div>

          <div>
            <p className="text-xs tracking-widest2 uppercase text-bone-muted mb-5">
              Navigate
            </p>
            <ul className="space-y-3">
              {[
                { to: '/', label: 'Home' },
                { to: '/', label: 'Shop', hash: '#shop' },
                { to: '/magazine', label: 'Magazine' },
                { to: '/staff', label: 'Staff' },
                { to: '/login', label: 'Staff Login' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-bone hover:text-lime transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs tracking-widest2 uppercase text-bone-muted mb-5">
              Info
            </p>
            <ul className="space-y-3 text-sm text-bone-muted">
              <li>PK / EST. {year}</li>
              <li className="uppercase">{settings.tagline}</li>
              <li>© {year} {brand.toUpperCase()}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 lg:mt-16 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-bone-muted font-mono tracking-wider">
            PK / EST. {year}
          </p>
          <p className="text-xs text-bone-muted tracking-wider">
            © {year} {brand.toUpperCase()} — ALL RIGHTS RESERVED
          </p>
          <p className="text-xs text-bone-muted font-mono tracking-wider">
            PK / {String(year).slice(-3).padStart(3, '0')}
          </p>
        </div>
      </div>
    </footer>
  );
}
