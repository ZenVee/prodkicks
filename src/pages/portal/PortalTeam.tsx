import { useEffect, useState } from 'react';
import { Plus, MoreVertical, Edit2, Trash2, X, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import type { StaffMember, StaffRole } from '@/types';
import { staffService } from '@/services/staffService';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/common/Modal';

const roleLabels: Record<StaffRole, string> = {
  owner: 'Owners',
  management: 'Management',
  staff: 'Staff',
};

const roleOrder: StaffRole[] = ['owner', 'management', 'staff'];

export default function PortalTeam() {
  const { showToast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    staffService.getAll().then((s) => {
      setStaff(s.sort((a, b) => a.displayOrder - b.displayOrder));
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await staffService.delete(deleteTarget.id);
    showToast(`${deleteTarget.name} removed`, 'success');
    setDeleteTarget(null);
    load();
  };

  const toggleShow = async (member: StaffMember) => {
    await staffService.update(member.id, { showOnWebsite: !member.showOnWebsite });
    showToast(`${member.name} ${!member.showOnWebsite ? 'now visible' : 'hidden'}`, 'info');
    load();
  };

  const moveOrder = async (member: StaffMember, dir: -1 | 1) => {
    const sorted = [...staff].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((s) => s.id === member.id);
    const target = idx + dir;
    if (target < 0 || target >= sorted.length) return;
    const swap = sorted[target];
    await Promise.all([
      staffService.update(member.id, { displayOrder: swap.displayOrder }),
      staffService.update(swap.id, { displayOrder: member.displayOrder }),
    ]);
    load();
  };

  const grouped = roleOrder.map((role) => ({
    role,
    members: staff.filter((s) => s.role === role),
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone">Team</h1>
          <p className="text-sm text-bone-muted mt-1">{staff.length} team members</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-lime text-ink text-sm font-medium tracking-wider uppercase hover:bg-lime-dark transition-colors"
        >
          <Plus size={16} />
          Add Member
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-bone-muted text-center py-12">Loading...</p>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => group.members.length > 0 && (
            <div key={group.role}>
              <h2 className="text-xs tracking-widest2 uppercase text-bone-muted mb-3">{roleLabels[group.role]}</h2>
              <div className="space-y-2">
                {group.members.map((member) => (
                  <div key={member.id} className="bg-ink-surface border border-white/5 p-3 flex items-center gap-3">
                    <div className="w-12 h-14 overflow-hidden bg-ink-raised shrink-0">
                      <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-bone truncate">{member.name}</p>
                        {!member.showOnWebsite && (
                          <span className="text-[10px] tracking-widest2 uppercase text-bone-muted/50 border border-white/10 px-1.5">Hidden</span>
                        )}
                      </div>
                      <p className="text-xs text-bone-muted truncate">{member.position}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveOrder(member, -1)} className="p-1.5 text-bone-muted hover:text-bone" aria-label="Move up">
                        <ArrowUp size={15} />
                      </button>
                      <button onClick={() => moveOrder(member, 1)} className="p-1.5 text-bone-muted hover:text-bone" aria-label="Move down">
                        <ArrowDown size={15} />
                      </button>
                      <button onClick={() => toggleShow(member)} className="p-1.5 text-bone-muted hover:text-lime" aria-label="Toggle visibility">
                        {member.showOnWebsite ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                      <div className="relative">
                        <button onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)} className="p-1.5 text-bone-muted hover:text-bone">
                          <MoreVertical size={15} />
                        </button>
                        {openMenu === member.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                            <div className="absolute right-0 top-full mt-1 w-32 bg-ink-surface border border-white/10 z-20 animate-slide-down">
                              <button onClick={() => { setEditing(member); setOpenMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-bone hover:bg-ink-raised hover:text-lime">
                                <Edit2 size={13} /> Edit
                              </button>
                              <button onClick={() => { setDeleteTarget(member); setOpenMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-ink-raised">
                                <Trash2 size={13} /> Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <TeamEditModal
          member={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={async (data) => {
            if (editing) {
              await staffService.update(editing.id, data);
              showToast('Member updated', 'success');
            } else {
              await staffService.create(data);
              showToast('Member added', 'success');
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
        title="Remove Member"
        onConfirm={handleDelete}
        confirmLabel="Remove"
      >
        <p className="text-sm text-bone-muted">
          Are you sure you want to remove <span className="text-bone">{deleteTarget?.name}</span> from the team?
        </p>
      </Modal>
    </div>
  );
}

function TeamEditModal({
  member,
  onClose,
  onSave,
}: {
  member: StaffMember | null;
  onClose: () => void;
  onSave: (data: Partial<StaffMember>) => void;
}) {
  const [name, setName] = useState(member?.name ?? '');
  const [position, setPosition] = useState(member?.position ?? '');
  const [role, setRole] = useState<StaffRole>(member?.role ?? 'staff');
  const [bio, setBio] = useState(member?.bio ?? '');
  const [photo, setPhoto] = useState(member?.photo ?? '');
  const [showOnWebsite, setShowOnWebsite] = useState(member?.showOnWebsite ?? true);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-ink-surface border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-ink-surface z-10">
          <h3 className="text-sm font-medium tracking-wider uppercase text-bone">{member ? 'Edit Member' : 'Add Member'}</h3>
          <button onClick={onClose} className="text-bone-muted hover:text-bone"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="portal-input" />
          </div>
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Position</label>
            <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className="portal-input" />
          </div>
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className="portal-input">
              <option value="owner">Owner</option>
              <option value="management">Management</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="portal-input resize-none" />
          </div>
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Photo URL</label>
            <input type="text" value={photo} onChange={(e) => setPhoto(e.target.value)} className="portal-input" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={showOnWebsite} onChange={(e) => setShowOnWebsite(e.target.checked)} className="accent-lime w-4 h-4" />
            <span className="text-sm text-bone">Show on website</span>
          </label>
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-white/5 sticky bottom-0 bg-ink-surface">
          <button onClick={onClose} className="px-4 py-2 text-xs tracking-wider uppercase text-bone-muted hover:text-bone">Cancel</button>
          <button
            onClick={() => onSave({ name, position, role, bio, photo, showOnWebsite })}
            className="px-4 py-2 text-xs tracking-wider uppercase bg-lime text-ink font-medium hover:bg-lime-dark transition-colors"
          >
            {member ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
