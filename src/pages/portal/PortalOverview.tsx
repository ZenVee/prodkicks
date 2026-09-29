import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, CheckCircle, Users, Calendar, Plus, FolderPlus, Home } from 'lucide-react';
import { productService } from '@/services/productService';
import { staffService } from '@/services/staffService';
import { dropService } from '@/services/dropService';
import Countdown from '@/components/common/Countdown';
import type { Product, Drop } from '@/types';
import { formatPrice, formatRelativeTime } from '@/utils/format';

export default function PortalOverview() {
  const [totalProducts, setTotalProducts] = useState(0);
  const [publishedProducts, setPublishedProducts] = useState(0);
  const [teamMembers, setTeamMembers] = useState(0);
  const [scheduledDrops, setScheduledDrops] = useState(0);
  const [upcomingDrop, setUpcomingDrop] = useState<Drop | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  useEffect(() => {
    Promise.all([
      productService.getAll(),
      productService.countByStatus('published'),
      staffService.count(),
      dropService.getUpcoming(),
      dropService.getRecent(),
      productService.getRecent(5),
    ]).then(([all, published, staff, upcoming, _recent, recent]) => {
      setTotalProducts(all.length);
      setPublishedProducts(published);
      setTeamMembers(staff);
      setScheduledDrops(upcoming.length);
      setUpcomingDrop(upcoming[0] ?? null);
      setRecentProducts(recent);
    });
  }, []);

  const cards = [
    { label: 'Total Products', value: totalProducts, icon: Package },
    { label: 'Published Products', value: publishedProducts, icon: CheckCircle },
    { label: 'Team Members', value: teamMembers, icon: Users },
    { label: 'Scheduled Drops', value: scheduledDrops, icon: Calendar },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone mb-1">Overview</h1>
      <p className="text-sm text-bone-muted mb-8">Welcome back to the Prod Kicks Employee Portal.</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map((card) => (
          <div key={card.label} className="bg-ink-surface border border-white/5 p-5">
            <div className="flex items-center justify-between mb-3">
              <card.icon size={18} className="text-bone-muted" />
            </div>
            <p className="font-display text-3xl lg:text-4xl text-bone tracking-tight">{card.value}</p>
            <p className="text-xs tracking-wider uppercase text-bone-muted mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Drop */}
        <div className="lg:col-span-2 bg-ink-surface border border-white/5 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm tracking-wider uppercase text-bone font-medium">Upcoming Drop</h2>
            <Link to="/portal/drops" className="text-xs text-lime hover:underline">Manage</Link>
          </div>
          {upcomingDrop ? (
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-full sm:w-40 aspect-square shrink-0 overflow-hidden bg-ink-raised">
                <img src={upcomingDrop.heroImage} alt={upcomingDrop.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-xs tracking-widest2 uppercase text-lime font-mono">{upcomingDrop.heroLabel}</p>
                <h3 className="font-display text-2xl text-bone mt-1">{upcomingDrop.name}</h3>
                <p className="text-xs text-bone-muted mt-1">
                  {new Date(upcomingDrop.releaseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {upcomingDrop.releaseTime}
                </p>
                <div className="mt-4">
                  <Countdown targetDate={`${upcomingDrop.releaseDate}T20:00:00`} size="sm" />
                </div>
                <Link
                  to="/portal/drops"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs tracking-wider uppercase bg-ink-raised text-bone border border-white/10 hover:border-lime/50 transition-colors"
                >
                  Edit Drop
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-bone-muted">No upcoming drops scheduled.</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-ink-surface border border-white/5 p-6">
          <h2 className="text-sm tracking-wider uppercase text-bone font-medium mb-5">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              to="/portal/products/new"
              className="flex items-center gap-3 px-4 py-3 bg-ink-raised border border-white/5 hover:border-lime/30 transition-colors text-sm text-bone"
            >
              <Plus size={16} className="text-lime" />
              Add Product
            </Link>
            <Link
              to="/portal/drops"
              className="flex items-center gap-3 px-4 py-3 bg-ink-raised border border-white/5 hover:border-lime/30 transition-colors text-sm text-bone"
            >
              <Calendar size={16} className="text-lime" />
              Create Drop
            </Link>
            <Link
              to="/portal/homepage"
              className="flex items-center gap-3 px-4 py-3 bg-ink-raised border border-white/5 hover:border-lime/30 transition-colors text-sm text-bone"
            >
              <Home size={16} className="text-lime" />
              Manage Homepage
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Products */}
      <div className="mt-6 bg-ink-surface border border-white/5 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm tracking-wider uppercase text-bone font-medium">Recent Products</h2>
          <Link to="/portal/products" className="text-xs text-lime hover:underline">View All</Link>
        </div>
        <div className="space-y-2">
          {recentProducts.map((p) => (
            <Link
              key={p.id}
              to={`/portal/products/${p.id}/edit`}
              className="flex items-center gap-4 px-3 py-2.5 hover:bg-ink-raised transition-colors group"
            >
              <div className="w-10 h-10 overflow-hidden bg-ink-raised shrink-0">
                <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-bone truncate group-hover:text-lime transition-colors">{p.name}</p>
                <p className="text-xs text-bone-muted">{p.sku} · {p.category}</p>
              </div>
              <p className="text-sm text-lime">{formatPrice(p.price, p.currency)}</p>
              <p className="text-xs text-bone-muted hidden sm:block w-20 text-right">{formatRelativeTime(p.updatedAt)}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
