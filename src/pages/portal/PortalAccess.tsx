import { useEffect, useState } from 'react';
import type { AccessRequest, StaffRoleRecord } from '@/types';
import { authService } from '@/services/authService';
import { useToast } from '@/hooks/useToast';
import { mapSupabaseError } from '@/utils/errors';
import { formatDateTime } from '@/utils/format';

export default function PortalAccess() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [roles, setRoles] = useState<StaffRoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [rows, assignable] = await Promise.all([
        authService.listPendingRequests(),
        authService.listAssignableRoles(),
      ]);
      setRequests(rows);
      setRoles(assignable);
      const defaultRoleId = assignable.find((r) => r.key === 'staff')?.id ?? assignable[0]?.id ?? '';
      const defaults: Record<string, string> = {};
      for (const row of rows) {
        defaults[row.id] = defaultRoleId;
      }
      setSelectedRoles(defaults);
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (id: string) => {
    const roleId = selectedRoles[id];
    if (!roleId) {
      showToast('Select a role before approving', 'error');
      return;
    }
    try {
      await authService.approve(id, roleId);
      showToast('Access approved', 'success');
      await load();
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    }
  };

  const decline = async (id: string) => {
    try {
      await authService.decline(id);
      showToast('Access declined', 'info');
      await load();
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone mb-1">Access Requests</h1>
      <p className="text-sm text-bone-muted mb-8">Review pending employee access requests.</p>

      <div className="bg-ink-surface border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Employee</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">State ID</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Submitted</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Role</th>
              <th className="text-right text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center text-sm text-bone-muted py-12">Loading...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-sm text-bone-muted py-12">No pending requests</td></tr>
            ) : requests.map((req) => (
              <tr key={req.id} className="border-b border-white/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {req.discordAvatarUrl ? (
                      <img src={req.discordAvatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-ink-raised" />
                    )}
                    <div>
                      <p className="text-sm text-bone">{req.fullName}</p>
                      <p className="text-xs text-bone-muted">{req.discordUsername}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-bone-muted">{req.stateId}</td>
                <td className="px-4 py-3 text-xs text-bone-muted">
                  {req.profileCompletedAt
                    ? formatDateTime(req.profileCompletedAt.slice(0, 10), new Date(req.profileCompletedAt).toLocaleTimeString())
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={selectedRoles[req.id] ?? ''}
                    onChange={(e) =>
                      setSelectedRoles((prev) => ({
                        ...prev,
                        [req.id]: e.target.value,
                      }))
                    }
                    className="portal-input"
                    disabled={roles.length === 0}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => approve(req.id)}
                    disabled={roles.length === 0}
                    className="px-3 py-1.5 text-xs uppercase tracking-wider bg-lime text-ink font-medium disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decline(req.id)}
                    className="px-3 py-1.5 text-xs uppercase tracking-wider border border-white/10 text-bone-muted hover:text-bone"
                  >
                    Decline
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
