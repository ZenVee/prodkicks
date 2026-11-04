import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Search, Shield, Trash2 } from 'lucide-react';
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
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingLabel, setEditingLabel] = useState('');
  const canManage = hasPermission('permissions.manage');

  const assignableRoles = useMemo(
    () => roles.filter((r) => r.key !== 'developer'),
    [roles]
  );

  const selectedRole = useMemo(
    () => assignableRoles.find((r) => r.id === selectedRoleId) ?? null,
    [assignableRoles, selectedRoleId]
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
      setSelectedRoleId((prev) => {
        if (prev && next[prev]) return prev;
        const first = allRoles.find((r) => r.key !== 'developer');
        return first?.id ?? null;
      });
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setEditingLabel(selectedRole?.label ?? '');
  }, [selectedRole?.id, selectedRole?.label]);

  const filteredDefs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return defs;
    return defs.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.key.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    );
  }, [defs, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionDefinition[]>();
    for (const def of filteredDefs) {
      const list = map.get(def.category) ?? [];
      list.push(def);
      map.set(def.category, list);
    }
    return [...map.entries()];
  }, [filteredDefs]);

  const selectedCount = selectedRoleId
    ? (matrix[selectedRoleId]?.size ?? 0)
    : 0;
  const totalCount = defs.length;

  const roleCount = (roleId: string) => matrix[roleId]?.size ?? 0;

  const toggle = async (roleId: string, key: Permission, enabled: boolean) => {
    if (!canManage || pendingKey) return;
    const token = `${roleId}:${key}`;
    setPendingKey(token);
    const prev = new Set(matrix[roleId] ?? []);
    setMatrix((m) => {
      const next = { ...m, [roleId]: new Set(m[roleId]) };
      if (enabled) next[roleId].add(key);
      else next[roleId].delete(key);
      return next;
    });
    try {
      await authService.setRolePermission(roleId, key, enabled);
    } catch (err) {
      setMatrix((m) => ({ ...m, [roleId]: prev }));
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setPendingKey(null);
    }
  };

  const setCategory = async (roleId: string, items: PermissionDefinition[], enabled: boolean) => {
    if (!canManage || pendingKey) return;
    const toChange = items.filter((item) => {
      const has = matrix[roleId]?.has(item.key) ?? false;
      return has !== enabled;
    });
    if (toChange.length === 0) return;

    setPendingKey(`${roleId}:category`);
    const prev = new Set(matrix[roleId] ?? []);
    setMatrix((m) => {
      const next = { ...m, [roleId]: new Set(m[roleId]) };
      for (const item of toChange) {
        if (enabled) next[roleId].add(item.key);
        else next[roleId].delete(item.key);
      }
      return next;
    });

    try {
      await Promise.all(
        toChange.map((item) => authService.setRolePermission(roleId, item.key, enabled))
      );
    } catch (err) {
      setMatrix((m) => ({ ...m, [roleId]: prev }));
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setPendingKey(null);
    }
  };

  const createRole = async () => {
    if (!canManage) return;
    setCreating(true);
    try {
      const created = await authService.createRole(newKey, newLabel);
      showToast('Role created', 'success');
      setCreateOpen(false);
      setNewKey('');
      setNewLabel('');
      await load();
      if (created?.id) setSelectedRoleId(created.id);
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const renameRole = async () => {
    if (!canManage || !selectedRole || selectedRole.isSystem) return;
    const next = editingLabel.trim();
    if (!next || next === selectedRole.label) return;
    try {
      await authService.updateRole(selectedRole.id, next, selectedRole.sortOrder);
      showToast('Role updated', 'success');
      await load();
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
      setEditingLabel(selectedRole.label);
    }
  };

  const deleteRole = async (role: StaffRoleRecord) => {
    if (!canManage || role.isSystem) return;
    if (!window.confirm(`Delete role "${role.label}"? Accounts using it must be reassigned first.`)) return;
    try {
      await authService.deleteRole(role.id);
      showToast('Role deleted', 'success');
      if (selectedRoleId === role.id) setSelectedRoleId(null);
      await load();
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone mb-1">
            Permissions
          </h1>
          <p className="text-sm text-bone-muted">
            Pick a role, then turn capabilities on or off. Developer always has full access.
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

      {loading ? (
        <p className="text-sm text-bone-muted">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-6 lg:gap-8">
          <aside className="space-y-1 lg:sticky lg:top-20 lg:self-start">
            <p className="text-[10px] tracking-widest2 uppercase text-bone-muted px-2 mb-2">
              Roles
            </p>
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 -mx-1 px-1">
              {assignableRoles.map((role) => {
                const count = roleCount(role.id);
                const active = role.id === selectedRoleId;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`shrink-0 lg:shrink text-left px-3 py-2.5 transition-colors border ${
                      active
                        ? 'border-lime/40 bg-lime/10 text-bone'
                        : 'border-transparent text-bone-muted hover:text-bone hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{role.label}</span>
                      <span className="text-[10px] font-mono tabular-nums opacity-70">
                        {count}/{totalCount || '—'}
                      </span>
                    </span>
                    <span className="block text-[10px] font-mono mt-0.5 opacity-50">{role.key}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden lg:flex items-start gap-2 px-3 py-3 mt-4 border border-dashed border-white/10 text-bone-muted">
              <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0 text-lime/70" />
              <p className="text-[11px] leading-relaxed">
                Developer is locked with every permission and is not listed here.
              </p>
            </div>
          </aside>

          <section className="min-w-0">
            {!selectedRole ? (
              <p className="text-sm text-bone-muted">Select a role to manage its permissions.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-3 mb-6 pb-6 border-b border-white/5">
                  <div className="flex-1 min-w-[12rem]">
                    <label className="block text-[10px] tracking-widest2 uppercase text-bone-muted mb-1.5">
                      Role name
                    </label>
                    <input
                      type="text"
                      value={editingLabel}
                      disabled={!canManage || selectedRole.isSystem}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      onBlur={() => void renameRole()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className="portal-input text-base font-medium"
                    />
                    <p className="text-[10px] font-mono text-bone-muted mt-1.5">
                      key: {selectedRole.key}
                      {selectedRole.isSystem ? ' · system role' : ''}
                    </p>
                  </div>

                  <div className="text-right pb-0.5">
                    <p className="text-2xl font-display tracking-tighter text-bone tabular-nums leading-none">
                      {selectedCount}
                      <span className="text-bone-muted text-base">/{totalCount}</span>
                    </p>
                    <p className="text-[10px] tracking-wider uppercase text-bone-muted mt-1">
                      enabled
                    </p>
                  </div>

                  {canManage && !selectedRole.isSystem && (
                    <button
                      type="button"
                      onClick={() => void deleteRole(selectedRole)}
                      className="p-2.5 text-bone-muted hover:text-red-400 border border-white/10 transition-colors"
                      aria-label={`Delete ${selectedRole.label}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-bone-muted pointer-events-none" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter permissions…"
                    className="portal-input pl-9"
                  />
                </div>

                {grouped.length === 0 ? (
                  <p className="text-sm text-bone-muted">No permissions match that filter.</p>
                ) : (
                  <div className="space-y-8">
                    {grouped.map(([category, items]) => {
                      const enabledInCategory = items.filter((item) =>
                        matrix[selectedRole.id]?.has(item.key)
                      ).length;
                      const allOn = enabledInCategory === items.length;
                      const noneOn = enabledInCategory === 0;

                      return (
                        <div key={category}>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div>
                              <h2 className="text-xs tracking-widest2 uppercase text-bone font-medium">
                                {category}
                              </h2>
                              <p className="text-[10px] text-bone-muted mt-0.5 tabular-nums">
                                {enabledInCategory} of {items.length} on
                              </p>
                            </div>
                            {canManage && (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  disabled={allOn || !!pendingKey}
                                  onClick={() => void setCategory(selectedRole.id, items, true)}
                                  className="px-2.5 py-1 text-[10px] uppercase tracking-wider text-bone-muted hover:text-bone border border-white/10 disabled:opacity-30"
                                >
                                  All
                                </button>
                                <button
                                  type="button"
                                  disabled={noneOn || !!pendingKey}
                                  onClick={() => void setCategory(selectedRole.id, items, false)}
                                  className="px-2.5 py-1 text-[10px] uppercase tracking-wider text-bone-muted hover:text-bone border border-white/10 disabled:opacity-30"
                                >
                                  None
                                </button>
                              </div>
                            )}
                          </div>

                          <ul className="divide-y divide-white/5 border-y border-white/5">
                            {items.map((item) => {
                              const checked = matrix[selectedRole.id]?.has(item.key) ?? false;
                              const busy = pendingKey === `${selectedRole.id}:${item.key}`;
                              return (
                                <li key={item.key}>
                                  <label
                                    className={`flex items-center gap-4 py-3.5 px-1 cursor-pointer group ${
                                      !canManage ? 'cursor-default' : ''
                                    } ${busy ? 'opacity-60' : ''}`}
                                  >
                                    <span className="flex-1 min-w-0">
                                      <span className="block text-sm text-bone group-hover:text-white transition-colors">
                                        {item.label}
                                      </span>
                                      <span className="block text-[10px] font-mono text-bone-muted mt-0.5">
                                        {item.key}
                                      </span>
                                    </span>
                                    <span
                                      className={`relative inline-flex h-6 w-11 shrink-0 items-center transition-colors ${
                                        checked ? 'bg-lime' : 'bg-white/10'
                                      } ${!canManage ? 'opacity-50' : ''}`}
                                      aria-hidden
                                    >
                                      <span
                                        className={`inline-flex h-5 w-5 items-center justify-center bg-ink transition-transform ${
                                          checked ? 'translate-x-[1.25rem]' : 'translate-x-0.5'
                                        }`}
                                      >
                                        {checked && <Check className="w-3 h-3 text-lime" strokeWidth={3} />}
                                      </span>
                                    </span>
                                    <input
                                      type="checkbox"
                                      className="sr-only"
                                      checked={checked}
                                      disabled={!canManage || !!pendingKey}
                                      onChange={(e) =>
                                        void toggle(selectedRole.id, item.key, e.target.checked)
                                      }
                                    />
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create role">
        <div className="space-y-4">
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">
              Key
            </label>
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="editor"
              className="portal-input w-full"
            />
            <p className="text-[10px] text-bone-muted mt-1">Lowercase letters, numbers, underscores.</p>
          </div>
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">
              Label
            </label>
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
