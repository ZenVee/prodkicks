import { useEffect, useState } from 'react';
import { Plus, MoreVertical, Edit2, Trash2, X, Calendar } from 'lucide-react';
import type { Drop } from '@/types';
import { dropService } from '@/services/dropService';
import { collectionService } from '@/services/collectionService';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/common/Modal';
import Countdown from '@/components/common/Countdown';
import type { Collection } from '@/types';

const statusTabs: { label: string; value: Drop['status'] }[] = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Active', value: 'active' },
  { label: 'Previous', value: 'previous' },
];

export default function PortalDrops() {
  const { showToast } = useToast();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Drop['status']>('upcoming');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Drop | null>(null);
  const [editing, setEditing] = useState<Drop | null>(null);
  const [creating, setCreating] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);

  const load = () => {
    setLoading(true);
    dropService.getAll().then((d) => {
      setDrops(d);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    collectionService.getAll().then(setCollections);
  }, []);

  const filtered = drops.filter((d) => d.status === tab);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dropService.delete(deleteTarget.id);
    showToast(`${deleteTarget.name} deleted`, 'success');
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone">Drops</h1>
          <p className="text-sm text-bone-muted mt-1">{drops.length} total drops</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-lime text-ink text-sm font-medium tracking-wider uppercase hover:bg-lime-dark transition-colors"
        >
          <Plus size={16} />
          Create Drop
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {statusTabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3.5 py-2 text-xs tracking-widest2 uppercase font-medium border transition-colors ${
              tab === t.value
                ? 'bg-lime text-ink border-lime'
                : 'text-bone-muted hover:text-bone border-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-bone-muted text-center py-12">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-bone-muted text-center py-12">No {tab} drops</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((drop) => (
            <div key={drop.id} className="bg-ink-surface border border-white/5 p-4 flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-28 h-32 sm:h-28 overflow-hidden bg-ink-raised shrink-0">
                <img src={drop.heroImage} alt={drop.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs tracking-widest2 uppercase text-lime font-mono">{drop.heroLabel}</p>
                    <h3 className="font-display text-xl text-bone mt-0.5">{drop.name}</h3>
                  </div>
                  <div className="relative">
                    <button onClick={() => setOpenMenu(openMenu === drop.id ? null : drop.id)} className="text-bone-muted hover:text-bone">
                      <MoreVertical size={16} />
                    </button>
                    {openMenu === drop.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                        <div className="absolute right-0 top-full mt-1 w-36 bg-ink-surface border border-white/10 z-20 animate-slide-down">
                          <button onClick={() => { setEditing(drop); setOpenMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-bone hover:bg-ink-raised hover:text-lime">
                            <Edit2 size={13} /> Edit
                          </button>
                          <button onClick={() => { setDeleteTarget(drop); setOpenMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-ink-raised">
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-bone-muted mt-1">
                  <Calendar size={12} className="inline mr-1" />
                  {new Date(drop.releaseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {drop.releaseTime}
                </p>
                {drop.status === 'upcoming' && drop.showCountdown && (
                  <div className="mt-2">
                    <Countdown targetDate={`${drop.releaseDate}T20:00:00`} size="sm" />
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {drop.featuredOnHomepage && (
                    <span className="text-[10px] tracking-widest2 uppercase text-lime border border-lime/30 px-2 py-0.5">Featured</span>
                  )}
                  {drop.showCountdown && (
                    <span className="text-[10px] tracking-widest2 uppercase text-bone-muted border border-white/10 px-2 py-0.5">Countdown</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {(editing || creating) && (
        <DropEditModal
          drop={editing}
          collections={collections}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={async (data) => {
            if (editing) {
              await dropService.update(editing.id, data);
              showToast('Drop updated', 'success');
            } else {
              await dropService.create(data);
              showToast('Drop created', 'success');
            }
            setEditing(null);
            setCreating(false);
            load();
          }}
        />
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Drop"
        onConfirm={handleDelete}
        confirmLabel="Delete"
      >
        <p className="text-sm text-bone-muted">
          Are you sure you want to delete <span className="text-bone">{deleteTarget?.name}</span>?
        </p>
      </Modal>
    </div>
  );
}

function DropEditModal({
  drop,
  collections,
  onClose,
  onSave,
}: {
  drop: Drop | null;
  collections: Collection[];
  onClose: () => void;
  onSave: (data: Partial<Drop>) => void;
}) {
  const [name, setName] = useState(drop?.name ?? '');
  const [dropNumber, setDropNumber] = useState(drop?.dropNumber ?? 1);
  const [collectionId, setCollectionId] = useState(drop?.collectionId ?? '');
  const [releaseDate, setReleaseDate] = useState(drop?.releaseDate ?? '');
  const [releaseTime, setReleaseTime] = useState(drop?.releaseTime ?? '8:00 PM');
  const [campaignHeadline, setCampaignHeadline] = useState(drop?.campaignHeadline ?? '');
  const [campaignSubtitle, setCampaignSubtitle] = useState(drop?.campaignSubtitle ?? '');
  const [campaignDescription, setCampaignDescription] = useState(drop?.campaignDescription ?? '');
  const [heroImage, setHeroImage] = useState(drop?.heroImage ?? '');
  const [heroLabel, setHeroLabel] = useState(drop?.heroLabel ?? '');
  const [showCountdown, setShowCountdown] = useState(drop?.showCountdown ?? true);
  const [featuredOnHomepage, setFeaturedOnHomepage] = useState(drop?.featuredOnHomepage ?? false);
  const [status, setStatus] = useState<Drop['status']>(drop?.status ?? 'upcoming');
  const [season, setSeason] = useState(drop?.season ?? '');

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-ink-surface border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-ink-surface z-10">
          <h3 className="text-sm font-medium tracking-wider uppercase text-bone">{drop ? 'Edit Drop' : 'Create Drop'}</h3>
          <button onClick={onClose} className="text-bone-muted hover:text-bone"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Drop Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="portal-input" />
            </div>
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Drop Number</label>
              <input type="number" value={dropNumber} onChange={(e) => setDropNumber(Number(e.target.value))} className="portal-input" />
            </div>
          </div>
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Collection</label>
            <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="portal-input">
              <option value="">None</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Release Date</label>
              <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="portal-input" />
            </div>
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Release Time</label>
              <input type="text" value={releaseTime} onChange={(e) => setReleaseTime(e.target.value)} className="portal-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Campaign Headline</label>
              <input type="text" value={campaignHeadline} onChange={(e) => setCampaignHeadline(e.target.value)} className="portal-input" />
            </div>
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Campaign Subtitle</label>
              <input type="text" value={campaignSubtitle} onChange={(e) => setCampaignSubtitle(e.target.value)} className="portal-input" />
            </div>
          </div>
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Campaign Description</label>
            <textarea value={campaignDescription} onChange={(e) => setCampaignDescription(e.target.value)} rows={2} className="portal-input resize-none" />
          </div>
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Hero Image URL</label>
            <input type="text" value={heroImage} onChange={(e) => setHeroImage(e.target.value)} className="portal-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Hero Label</label>
              <input type="text" value={heroLabel} onChange={(e) => setHeroLabel(e.target.value)} className="portal-input" />
            </div>
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Season</label>
              <input type="text" value={season} onChange={(e) => setSeason(e.target.value)} className="portal-input" />
            </div>
          </div>
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as Drop['status'])} className="portal-input">
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="previous">Previous</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={showCountdown} onChange={(e) => setShowCountdown(e.target.checked)} className="accent-lime w-4 h-4" />
              <span className="text-sm text-bone">Display Countdown</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={featuredOnHomepage} onChange={(e) => setFeaturedOnHomepage(e.target.checked)} className="accent-lime w-4 h-4" />
              <span className="text-sm text-bone">Feature on Homepage</span>
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-white/5 sticky bottom-0 bg-ink-surface">
          <button onClick={onClose} className="px-4 py-2 text-xs tracking-wider uppercase text-bone-muted hover:text-bone">Cancel</button>
          <button
            onClick={() => onSave({ name, dropNumber, collectionId: collectionId || null, releaseDate, releaseTime, campaignHeadline, campaignSubtitle, campaignDescription, heroImage, heroLabel, showCountdown, featuredOnHomepage, status, season })}
            className="px-4 py-2 text-xs tracking-wider uppercase bg-lime text-ink font-medium hover:bg-lime-dark transition-colors"
          >
            {drop ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
