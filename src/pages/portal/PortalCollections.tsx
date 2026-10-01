import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MoreVertical, Edit2, Archive, Trash2, X } from 'lucide-react';
import type { Collection } from '@/types';
import { collectionService } from '@/services/collectionService';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/common/Modal';
import SlugField from '@/components/common/SlugField';
import { slugify } from '@/utils/format';
import { mapSupabaseError } from '@/utils/errors';

export default function PortalCollections() {
  const { showToast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    collectionService
      .getAll()
      .then((c) => {
        setCollections(c);
        setLoading(false);
      })
      .catch((err) => {
        showToast(mapSupabaseError(err).message, 'error');
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await collectionService.delete(deleteTarget.id);
      showToast(`${deleteTarget.name} deleted`, 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    }
  };

  const handleArchive = async (col: Collection) => {
    try {
      await collectionService.archive(col.id);
      showToast(`${col.name} archived`, 'info');
      load();
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone">Collections</h1>
          <p className="text-sm text-bone-muted mt-1">{collections.length} collections</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-lime text-ink text-sm font-medium tracking-wider uppercase hover:bg-lime-dark transition-colors"
        >
          <Plus size={16} />
          Create Collection
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-sm text-bone-muted text-center py-12">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((col) => (
            <div key={col.id} className="bg-ink-surface border border-white/5 group">
              <div className="relative aspect-[16/10] overflow-hidden bg-ink-raised">
                <img src={col.campaignImage} alt={col.name} className="w-full h-full object-cover" />
                {col.archived && (
                  <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
                    <span className="text-xs tracking-widest2 uppercase text-bone-muted">Archived</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => setOpenMenu(openMenu === col.id ? null : col.id)}
                    className="p-1.5 bg-ink/80 text-bone-muted hover:text-bone"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenu === col.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 w-36 bg-ink-surface border border-white/10 z-20 animate-slide-down">
                        <button onClick={() => { setEditing(col); setOpenMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-bone hover:bg-ink-raised hover:text-lime">
                          <Edit2 size={13} /> Edit
                        </button>
                        <button onClick={() => handleArchive(col)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-bone hover:bg-ink-raised hover:text-lime">
                          <Archive size={13} /> Archive
                        </button>
                        <button onClick={() => { setDeleteTarget(col); setOpenMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-ink-raised">
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-medium text-bone">{col.name}</h3>
                <p className="text-xs text-bone-muted mt-1">{col.productIds.length} products</p>
                <Link to={`/collections/${col.slug}`} className="text-xs text-lime hover:underline mt-2 inline-block">
                  View on site →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {(editing || creating) && (
        <CollectionEditModal
          collection={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={async (data) => {
            try {
              if (editing) {
                await collectionService.update(editing.id, data);
                showToast('Collection updated', 'success');
              } else {
                await collectionService.create(data);
                showToast('Collection created', 'success');
              }
              setEditing(null);
              setCreating(false);
              load();
            } catch (err) {
              showToast(mapSupabaseError(err).message, 'error');
            }
          }}
        />
      )}

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Collection"
        onConfirm={handleDelete}
        confirmLabel="Delete"
      >
        <p className="text-sm text-bone-muted">
          Are you sure you want to delete <span className="text-bone">{deleteTarget?.name}</span>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function CollectionEditModal({
  collection,
  onClose,
  onSave,
}: {
  collection: Collection | null;
  onClose: () => void;
  onSave: (data: Partial<Collection>) => void;
}) {
  const [name, setName] = useState(collection?.name ?? '');
  const [slug, setSlug] = useState(collection?.slug ?? '');
  const [slugLocked, setSlugLocked] = useState(true);
  const [description, setDescription] = useState(collection?.description ?? '');
  const [campaignImage, setCampaignImage] = useState(collection?.campaignImage ?? '');
  const [campaignHeadline, setCampaignHeadline] = useState(collection?.campaignHeadline ?? '');
  const [campaignSubtitle, setCampaignSubtitle] = useState(collection?.campaignSubtitle ?? '');
  const [displayOrder, setDisplayOrder] = useState(collection?.displayOrder ?? 1);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-ink-surface border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-ink-surface z-10">
          <h3 className="text-sm font-medium tracking-wider uppercase text-bone">
            {collection ? 'Edit Collection' : 'Create Collection'}
          </h3>
          <button onClick={onClose} className="text-bone-muted hover:text-bone"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Collection Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const next = e.target.value;
                setName(next);
                if (slugLocked) setSlug(slugify(next));
              }}
              className="portal-input"
            />
          </div>
          <SlugField value={slug} onChange={setSlug} onLockChange={setSlugLocked} />
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="portal-input resize-none" />
          </div>
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Campaign Image URL</label>
            <input type="text" value={campaignImage} onChange={(e) => setCampaignImage(e.target.value)} className="portal-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Headline</label>
              <input type="text" value={campaignHeadline} onChange={(e) => setCampaignHeadline(e.target.value)} className="portal-input" />
            </div>
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Subtitle</label>
              <input type="text" value={campaignSubtitle} onChange={(e) => setCampaignSubtitle(e.target.value)} className="portal-input" />
            </div>
          </div>
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Display Order</label>
            <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} className="portal-input" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-white/5 sticky bottom-0 bg-ink-surface">
          <button onClick={onClose} className="px-4 py-2 text-xs tracking-wider uppercase text-bone-muted hover:text-bone transition-colors">Cancel</button>
          <button
            onClick={() => onSave({ name, slug, description, campaignImage, campaignHeadline, campaignSubtitle, displayOrder })}
            className="px-4 py-2 text-xs tracking-wider uppercase bg-lime text-ink font-medium hover:bg-lime-dark transition-colors"
          >
            {collection ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
