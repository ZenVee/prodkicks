import { useEffect, useMemo, useState } from 'react';
import type { EmployeeRole, Permission, PermissionDefinition } from '@/types';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { mapSupabaseError } from '@/utils/errors';

const ROLES: Exclude<EmployeeRole, 'developer'>[] = ['staff', 'manager', 'owner'];

export default function PortalPermissions() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const [defs, setDefs] = useState<PermissionDefinition[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Set<Permission>>>({
    staff: new Set(),
    manager: new Set(),
    owner: new Set(),
  });
  const [loading, setLoading] = useState(true);
  const canManage = hasPermission('permissions.manage');

  const load = async () => {
    setLoading(true);
    try {
      const [permissions, rolePerms] = await Promise.all([
        authService.listPermissions(),
        authService.listAllRolePermissions(),
      ]);
      setDefs(permissions);
      const next: Record<string, Set<Permission>> = {
        staff: new Set(),
        manager: new Set(),
        owner: new Set(),
      };
      for (const row of rolePerms) {
        next[row.role]?.add(row.permissionKey);
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

  const toggle = async (role: Exclude<EmployeeRole, 'developer'>, key: Permission, enabled: boolean) => {
    if (!canManage) return;
    try {
      await authService.setRolePermission(role, key, enabled);
      setMatrix((prev) => {
        const next = { ...prev, [role]: new Set(prev[role]) };
        if (enabled) next[role].add(key);
        else next[role].delete(key);
        return next;
      });
      showToast('Permission updated', 'success');
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone mb-1">Permissions</h1>
      <p className="text-sm text-bone-muted mb-8">
        Configure Owner, Manager, and Staff permissions. Developer always has full access.
      </p>

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
                    {ROLES.map((role) => (
                      <th key={role} className="text-center text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3 capitalize">
                        {role}
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
                      {ROLES.map((role) => {
                        const checked = matrix[role]?.has(item.key) ?? false;
                        return (
                          <td key={role} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!canManage}
                              onChange={(e) => void toggle(role, item.key, e.target.checked)}
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
    </div>
  );
}
