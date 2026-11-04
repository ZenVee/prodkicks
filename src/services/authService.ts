import type { User as AuthUser, Session } from '@supabase/supabase-js';
import type {
  AccessRequest,
  AuditLogEntry,
  Permission,
  PermissionDefinition,
  StaffAccount,
  StaffRoleRecord,
} from '@/types';
import type { Database } from '@/types/database';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapSupabaseError } from '@/utils/errors';

type StaffRow = Database['public']['Tables']['staff_accounts']['Row'];
type RoleRow = Database['public']['Tables']['staff_roles']['Row'];

const PENDING_SIGN_IN_AUDIT_KEY = 'prodkicks.pending_sign_in_audit';

export function mapStaffRole(row: RoleRow): StaffRoleRecord {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    isSystem: row.is_system,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapStaffAccount(
  row: StaffRow,
  role?: { key: string; label: string } | null
): StaffAccount {
  return {
    id: row.id,
    discordId: row.discord_id,
    discordUsername: row.discord_username,
    discordAvatarUrl: row.discord_avatar_url,
    fullName: row.full_name,
    stateId: row.state_id,
    status: row.status,
    roleId: row.role_id,
    roleKey: role?.key ?? null,
    roleLabel: role?.label ?? null,
    profileCompletedAt: row.profile_completed_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toAuthUser(authUser: AuthUser, account: StaffAccount | null): {
  id: string;
  name: string;
  email: string;
  avatar: string;
  roleKey: string | null;
  roleLabel: string | null;
  position: string;
} {
  return {
    id: authUser.id,
    name: account?.fullName ?? account?.discordUsername ?? authUser.user_metadata?.full_name ?? 'Staff',
    email: authUser.email ?? '',
    avatar:
      account?.discordAvatarUrl ??
      authUser.user_metadata?.avatar_url ??
      authUser.user_metadata?.picture ??
      '',
    roleKey: account?.roleKey ?? null,
    roleLabel: account?.roleLabel ?? null,
    position: account?.roleLabel
      ? account.roleLabel
      : account?.status === 'pending'
        ? 'Access pending'
        : 'Staff',
  };
}

export function destinationForAccount(account: StaffAccount | null): string {
  if (!account || account.status == null) return '/profile-setup';
  if (account.status === 'approved') return '/portal';
  return '/';
}

async function resolveOwnRole(
  roleId: string | null
): Promise<{ key: string; label: string } | null> {
  if (!roleId) return null;

  // 1) jsonb RPC — reliable across PostgREST
  const { data: info } = await getSupabase().rpc('current_staff_role_info');
  if (info && typeof info === 'object' && !Array.isArray(info) && 'key' in info) {
    const key = String((info as { key: unknown }).key ?? '');
    const label = String((info as { label?: unknown }).label ?? key);
    if (key) return { key, label };
  }

  // 2) text RPC
  const { data: keyOnly } = await getSupabase().rpc('current_staff_role_key');
  if (typeof keyOnly === 'string' && keyOnly.length > 0) {
    return { key: keyOnly, label: keyOnly };
  }

  // 3) direct table read
  const { data: row } = await getSupabase()
    .from('staff_roles')
    .select('key, label')
    .eq('id', roleId)
    .maybeSingle();
  if (row?.key) return { key: row.key, label: row.label };

  return null;
}

export const authService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  async getSession(): Promise<Session | null> {
    const { data, error } = await getSupabase().auth.getSession();
    if (error) throw mapSupabaseError(error);
    return data.session;
  },

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return () => data.subscription.unsubscribe();
  },

  async signInWithDiscord(): Promise<void> {
    const redirectTo = `${window.location.origin}/auth/callback`;
    sessionStorage.setItem(PENDING_SIGN_IN_AUDIT_KEY, '1');
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo },
    });
    if (error) {
      sessionStorage.removeItem(PENDING_SIGN_IN_AUDIT_KEY);
      throw mapSupabaseError(error, 'Could not start Discord sign-in.');
    }
  },

  consumePendingSignInAudit(): boolean {
    if (sessionStorage.getItem(PENDING_SIGN_IN_AUDIT_KEY) !== '1') return false;
    sessionStorage.removeItem(PENDING_SIGN_IN_AUDIT_KEY);
    return true;
  },

  async signOut(): Promise<void> {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw mapSupabaseError(error, 'Could not sign out.');
  },

  async getStaffAccount(userId: string): Promise<StaffAccount | null> {
    const { data, error } = await getSupabase()
      .from('staff_accounts')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw mapSupabaseError(error);
    if (!data) return null;

    const role = await resolveOwnRole(data.role_id);
    return mapStaffAccount(data, role);
  },

  /**
   * Resolve portal permissions from the DB (source of truth).
   * Developer is detected via role key or by holding every catalog permission.
   */
  async getEffectiveAccess(account: StaffAccount): Promise<{
    account: StaffAccount;
    permissions: Permission[];
    isDeveloper: boolean;
  }> {
    let next = account;
    if (!next.roleKey && next.roleId) {
      const role = await resolveOwnRole(next.roleId);
      if (role) next = { ...next, roleKey: role.key, roleLabel: role.label };
    }

    if (next.status !== 'approved') {
      return { account: next, permissions: [], isDeveloper: false };
    }

    if (next.roleKey === 'developer') {
      return { account: next, permissions: [], isDeveloper: true };
    }

    // Always probe DB has_permission — authoritative, works when roleKey is missing.
    const defs = await this.listPermissions().catch(() => [] as PermissionDefinition[]);
    if (defs.length > 0) {
      const granted: Permission[] = [];
      await Promise.all(
        defs.map(async (def) => {
          const { data } = await getSupabase().rpc('has_permission', {
            requested_permission: def.key,
          });
          if (data) granted.push(def.key);
        })
      );

      const isDeveloper = granted.length === defs.length;
      if (isDeveloper) {
        return {
          account: {
            ...next,
            roleKey: next.roleKey ?? 'developer',
            roleLabel: next.roleLabel ?? 'Developer',
          },
          permissions: [],
          isDeveloper: true,
        };
      }

      if (granted.length > 0) {
        return { account: next, permissions: granted, isDeveloper: false };
      }
    }

    if (next.roleId) {
      try {
        const rolePerms = await this.getRolePermissions(next.roleId);
        return { account: next, permissions: rolePerms, isDeveloper: false };
      } catch {
        return { account: next, permissions: [], isDeveloper: false };
      }
    }

    return { account: next, permissions: [], isDeveloper: false };
  },

  async listRoles(): Promise<StaffRoleRecord[]> {
    const { data, error } = await getSupabase()
      .from('staff_roles')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map(mapStaffRole);
  },

  async listAssignableRoles(): Promise<StaffRoleRecord[]> {
    const roles = await this.listRoles();
    return roles.filter((r) => r.key !== 'developer');
  },

  async createRole(key: string, label: string): Promise<StaffRoleRecord> {
    const { data, error } = await getSupabase().rpc('create_staff_role', {
      role_key: key,
      role_label: label,
    });
    if (error) throw mapSupabaseError(error);
    return mapStaffRole(data);
  },

  async updateRole(roleId: string, label: string, sortOrder?: number): Promise<StaffRoleRecord> {
    const { data, error } = await getSupabase().rpc('update_staff_role', {
      target_role_id: roleId,
      role_label: label,
      role_sort_order: sortOrder ?? null,
    });
    if (error) throw mapSupabaseError(error);
    return mapStaffRole(data);
  },

  async deleteRole(roleId: string): Promise<void> {
    const { error } = await getSupabase().rpc('delete_staff_role', {
      target_role_id: roleId,
    });
    if (error) throw mapSupabaseError(error);
  },

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const { data, error } = await getSupabase()
      .from('role_permissions')
      .select('permission_key')
      .eq('role_id', roleId);
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map((row) => row.permission_key as Permission);
  },

  subscribeStaffAccount(userId: string, onChange: () => void) {
    const channel = getSupabase()
      .channel(`staff_account:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_accounts', filter: `id=eq.${userId}` },
        () => onChange()
      )
      .subscribe();
    return () => {
      void getSupabase().removeChannel(channel);
    };
  },

  async submitProfile(fullName: string, stateId: string): Promise<StaffAccount> {
    const { data, error } = await getSupabase().rpc('submit_staff_profile', {
      full_name: fullName,
      state_id: stateId,
    });
    if (error) throw mapSupabaseError(error);
    return this.getStaffAccount(data.id).then((acct) => {
      if (!acct) throw mapSupabaseError(new Error('Account not found after profile submit.'));
      return acct;
    });
  },

  async listPendingRequests(): Promise<AccessRequest[]> {
    const { data, error } = await getSupabase()
      .from('staff_accounts')
      .select('*')
      .eq('status', 'pending')
      .order('profile_completed_at', { ascending: true });
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map((row) => ({
      id: row.id,
      discordUsername: row.discord_username,
      discordAvatarUrl: row.discord_avatar_url,
      fullName: row.full_name,
      stateId: row.state_id,
      profileCompletedAt: row.profile_completed_at,
      createdAt: row.created_at,
    }));
  },

  async listEmployees(): Promise<StaffAccount[]> {
    const [{ data, error }, roles] = await Promise.all([
      getSupabase()
        .from('staff_accounts')
        .select('*')
        .in('status', ['approved', 'disabled'])
        .order('approved_at', { ascending: false }),
      this.listRoles().catch(() => [] as StaffRoleRecord[]),
    ]);
    if (error) throw mapSupabaseError(error);
    const byId = new Map(roles.map((r) => [r.id, r]));
    return (data ?? []).map((row) => {
      const role = row.role_id ? byId.get(row.role_id) : undefined;
      return mapStaffAccount(row, role ? { key: role.key, label: role.label } : null);
    });
  },

  async approve(targetUserId: string, roleId: string): Promise<StaffAccount> {
    const { data, error } = await getSupabase().rpc('approve_staff_account', {
      target_user_id: targetUserId,
      assigned_role_id: roleId,
    });
    if (error) throw mapSupabaseError(error);
    const account = await this.getStaffAccount(data.id);
    if (!account) throw mapSupabaseError(new Error('Account not found after approve.'));
    return account;
  },

  async decline(targetUserId: string): Promise<StaffAccount> {
    const { data, error } = await getSupabase().rpc('decline_staff_account', {
      target_user_id: targetUserId,
    });
    if (error) throw mapSupabaseError(error);
    const account = await this.getStaffAccount(data.id);
    if (!account) throw mapSupabaseError(new Error('Account not found after decline.'));
    return account;
  },

  async disable(targetUserId: string): Promise<StaffAccount> {
    const { data, error } = await getSupabase().rpc('disable_staff_account', {
      target_user_id: targetUserId,
    });
    if (error) throw mapSupabaseError(error);
    const account = await this.getStaffAccount(data.id);
    if (!account) throw mapSupabaseError(new Error('Account not found after disable.'));
    return account;
  },

  async enable(targetUserId: string): Promise<StaffAccount> {
    const { data, error } = await getSupabase().rpc('enable_staff_account', {
      target_user_id: targetUserId,
    });
    if (error) throw mapSupabaseError(error);
    const account = await this.getStaffAccount(data.id);
    if (!account) throw mapSupabaseError(new Error('Account not found after enable.'));
    return account;
  },

  async changeRole(targetUserId: string, roleId: string): Promise<StaffAccount> {
    const { data, error } = await getSupabase().rpc('change_staff_role', {
      target_user_id: targetUserId,
      new_role_id: roleId,
    });
    if (error) throw mapSupabaseError(error);
    const account = await this.getStaffAccount(data.id);
    if (!account) throw mapSupabaseError(new Error('Account not found after role change.'));
    return account;
  },

  async listPermissions(): Promise<PermissionDefinition[]> {
    const { data, error } = await getSupabase()
      .from('permissions')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map((row) => ({
      key: row.key as Permission,
      category: row.category,
      label: row.label,
      sortOrder: row.sort_order,
    }));
  },

  async listAllRolePermissions(): Promise<{ roleId: string; permissionKey: Permission }[]> {
    const { data, error } = await getSupabase().from('role_permissions').select('*');
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map((row) => ({
      roleId: row.role_id,
      permissionKey: row.permission_key as Permission,
    }));
  },

  async setRolePermission(roleId: string, permissionKey: Permission, enabled: boolean): Promise<void> {
    const { error } = await getSupabase().rpc('set_role_permission', {
      target_role_id: roleId,
      permission_key: permissionKey,
      enabled,
    });
    if (error) throw mapSupabaseError(error);
  },

  async recordStaffSession(event: 'signed_in' | 'signed_out'): Promise<void> {
    const { error } = await getSupabase().rpc('record_staff_session', { event });
    if (error) throw mapSupabaseError(error);
  },

  async listAuditLog(limit = 200): Promise<AuditLogEntry[]> {
    const { data, error } = await getSupabase()
      .from('staff_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw mapSupabaseError(error);

    const rows = data ?? [];
    const userIds = [
      ...new Set(
        rows.flatMap((row) => [row.actor_user_id, row.target_user_id].filter((id): id is string => Boolean(id)))
      ),
    ];
    const names = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: accounts, error: accountError } = await getSupabase()
        .from('staff_accounts')
        .select('id, full_name, discord_username')
        .in('id', userIds);
      if (accountError) throw mapSupabaseError(accountError);
      for (const account of accounts ?? []) {
        const label = account.full_name?.trim() || account.discord_username?.trim();
        if (label) names.set(account.id, label);
      }
    }

    return rows.map((row) => ({
      id: row.id,
      actorUserId: row.actor_user_id,
      actorName: row.actor_user_id ? names.get(row.actor_user_id) ?? null : null,
      targetUserId: row.target_user_id,
      targetName: row.target_user_id ? names.get(row.target_user_id) ?? null : null,
      action: row.action,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      createdAt: row.created_at,
    }));
  },
};
