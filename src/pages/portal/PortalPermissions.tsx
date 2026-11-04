import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Permission, PermissionDefinition, StaffRoleRecord } from '@/types';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { mapSupabaseError } from '@/utils/errors';
import Modal from '@/components/common/Modal';

export default function PortalPermissions() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const [defs, setDefs] = useState<PermissionDefinition[]>([]);
  const [roles, setRoles] = useState<StaffRoleRecord[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Set<Permission>>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const canManage = hasPermission('permissions.manage');

  const assignableRoles = useMemo(
    () => roles.filter((r) => r.key !== 'developer'),
    [roles]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [permissions, rolePerms, allRoles] = await Promise.all([
        authService.listPermissions(),
        authService.listAllRolePermissions(),
        authService.listRoles(),
      ]);
      setDefs(permissions);
      setRoles(allRoles);
      const next: Record<string, Set<Permission>> = {};
      for (const role of allRoles) {
        if (role.key !== 'developer') next[role.id] = new Set();
      }
      for (const row of rolePerms) {
        next[row.roleId]?.add(row.permissionKey);
      }
      setMatrix(next);
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionDefinition[]>();
    for (const def of defs) {
      const list = map.get(def.category) ?? [];
      list.push(def);
      map.set(def.category, list);
    }
    return [...map.entries()];
  }, [defs]);

  const toggle = async (roleId: string, key: Permission, enabled: boolean) => {
    if (!canManage) return;
    try {
      await authService.setRolePermission(roleId, key, enabled);
      setMatrix((prev) => {
        const next = { ...prev, [roleId]: new Set(prev[roleId]) };
        if (enabled) next[roleId].add(key);
        else next[roleId].delete(key);
        return next;
      });
      showToast('Permission updated', 'success');
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    }
  };

  const createRole = async () => {
    if (!canManage) return;
    setCreating(true);
    try {
      await authService.createRole(newKey, newLabel);
      showToast('Role created', 'success');
      setCreateOpen(false);
      setNewKey('');
      setNewLabel('');
      await load();
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const renameRole = async (role: StaffRoleRecord, label: string) => {
    if (!canManage || role.isSystem || label.trim() === role.label) return;
    try {
      await authService.updateRole(role.id, label.trim(), role.sortOrder);
      showToast('Role updated', 'success');
      await load();
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    }
  };

  const deleteRole = async (role: StaffRoleRecord) => {
    if (!canManage || role.isSystem) return;
    if (!window.confirm(`Delete role "${role.label}"? Accounts using it must be reassigned first.`)) return;
    try {
      await authService.deleteRole(role.id);
      showToast('Role deleted', 'success');
      await load();
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone mb-1">Permissions</h1>
          <p className="text-sm text-bone-muted">
            Create roles and assign permissions. Developer always has full access.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider bg-lime text-ink font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            New role
          </button>
        )}
      </div>

      {canManage && assignableRoles.length > 0 && (
        <div className="bg-ink-surface border border-white/5 mb-8 divide-y divide-white/5">
          {assignableRoles.map((role) => (
            <div key={role.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <input
                type="text"
                defaultValue={role.label}
                disabled={role.isSystem}
                onBlur={(e) => void renameRole(role, e.target.value)}
                className="portal-input text-sm min-w-[10rem] flex-1 max-w-xs"
              />
              <span className="text-[10px] font-mono text-bone-muted">{role.key}</span>
              {!role.isSystem && (
                <button
                  type="button"
                  onClick={() => void deleteRole(role)}
                  className="p-2 text-bone-muted hover:text-red-400 transition-colors"
                  aria-label={`Delete ${role.label}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-bone-muted">Loading...</p>
      ) : (
        <div className="space-y-8">
          {grouped.map(([category, items]) => (
            <div key={category} className="bg-ink-surface border border-white/5 overflow-x-auto">
              <div className="px-4 py-3 border-b border-white/5">
                <h2 className="text-sm tracking-wider uppercase text-bone font-medium">{category}</h2>
              </div>
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Permission</th>
                    {assignableRoles.map((role) => (
                      <th key={role.id} className="text-center text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">
                        {role.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.key} className="border-b border-white/5">
                      <td className="px-4 py-3">
                        <p className="text-sm text-bone">{item.label}</p>
                        <p className="text-[10px] font-mono text-bone-muted">{item.key}</p>
                      </td>
                      {assignableRoles.map((role) => {
                        const checked = matrix[role.id]?.has(item.key) ?? false;
                        return (
                          <td key={role.id} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!canManage}
                              onChange={(e) => void toggle(role.id, item.key, e.target.checked)}
                              className="accent-lime"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create role">
        <div className="space-y-4">
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Key</label>
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="editor"
              className="portal-input w-full"
            />
            <p className="text-[10px] text-bone-muted mt-1">Lowercase letters, numbers, underscores.</p>
          </div>
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Label</label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Editor"
              className="portal-input w-full"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-3 py-2 text-xs uppercase tracking-wider border border-white/10 text-bone-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={creating || !newKey || !newLabel.trim()}
              onClick={() => void createRole()}
              className="px-3 py-2 text-xs uppercase tracking-wider bg-lime text-ink font-medium disabled:opacity-40"
            >
              Create
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
