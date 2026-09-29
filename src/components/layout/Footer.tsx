import { Link } from 'react-router-dom';
import { Instagram, Twitter, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative bg-ink-surface border-t border-white/5 overflow-hidden">
      {/* Oversized faded text */}
      <div className="absolute -bottom-6 sm:-bottom-10 lg:-bottom-16 left-0 right-0 pointer-events-none select-none overflow-hidden">
        <p className="font-display text-[18vw] leading-none text-white/[0.025] whitespace-nowrap tracking-tighter">
          PROD KICKS
        </p>
      </div>

      <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-16 lg:pt-24 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-baseline gap-1.5">
              <span className="font-display text-2xl lg:text-3xl tracking-tight text-bone">
                PROD KICKS
              </span>
              <span className="text-lime text-sm font-mono">®</span>
            </Link>
            <p className="mt-4 text-xs tracking-widest2 uppercase text-bone-muted">
              Footwear / Apparel / Culture
            </p>
            <p className="mt-6 max-w-md text-sm text-bone-muted leading-relaxed">
              Prod Kicks is a modern sneaker and streetwear retailer. Footwear, apparel, culture.
            </p>
            <div className="flex items-center gap-4 mt-8">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center border border-white/10 text-bone-muted hover:text-lime hover:border-lime/50 transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={16} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center border border-white/10 text-bone-muted hover:text-lime hover:border-lime/50 transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={16} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center border border-white/10 text-bone-muted hover:text-lime hover:border-lime/50 transition-colors"
                aria-label="YouTube"
              >
                <Youtube size={16} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs tracking-widest2 uppercase text-bone-muted mb-5">
              Navigate
            </p>
            <ul className="space-y-3">
              {[
                { to: '/', label: 'Home' },
                { to: '/', label: 'Shop', hash: '#shop' },
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

          {/* Info */}
          <div>
            <p className="text-xs tracking-widest2 uppercase text-bone-muted mb-5">
              Info
            </p>
            <ul className="space-y-3 text-sm text-bone-muted">
              <li>PK / EST. 2026</li>
              <li>FOOTWEAR / APPAREL / CULTURE</li>
              <li>© 2026 PROD KICKS</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 lg:mt-16 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-bone-muted font-mono tracking-wider">
            PK / EST. 2026
          </p>
          <p className="text-xs text-bone-muted tracking-wider">
            © 2026 PROD KICKS — ALL RIGHTS RESERVED
          </p>
          <p className="text-xs text-bone-muted font-mono tracking-wider">
            PK / 026
          </p>
        </div>
      </div>
    </footer>
  );
}
