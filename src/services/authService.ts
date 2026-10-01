import type { User as AuthUser, Session } from '@supabase/supabase-js';
import type {
  AccessRequest,
  AuditLogEntry,
  EmployeeRole,
  Permission,
  PermissionDefinition,
  StaffAccount,
} from '@/types';
import type { Database } from '@/types/database';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapSupabaseError } from '@/utils/errors';

type StaffRow = Database['public']['Tables']['staff_accounts']['Row'];

export function mapStaffAccount(row: StaffRow): StaffAccount {
  return {
    id: row.id,
    discordId: row.discord_id,
    discordUsername: row.discord_username,
    discordAvatarUrl: row.discord_avatar_url,
    fullName: row.full_name,
    stateId: row.state_id,
    status: row.status,
    role: row.role,
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
  role: EmployeeRole | null;
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
    role: account?.role ?? null,
    position: account?.role ? account.role : account?.status === 'pending' ? 'Access pending' : 'Staff',
  };
}

export function assignableRolesFor(actorRole: EmployeeRole | null): Exclude<EmployeeRole, 'developer'>[] {
  if (actorRole === 'developer') return ['owner', 'manager', 'staff'];
  if (actorRole === 'owner') return ['manager', 'staff'];
  if (actorRole === 'manager') return ['staff'];
  return [];
}

export function destinationForAccount(account: StaffAccount | null): string {
  if (!account || account.status == null) return '/profile-setup';
  if (account.status === 'approved') return '/portal';
  return '/';
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
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo },
    });
    if (error) throw mapSupabaseError(error, 'Could not start Discord sign-in.');
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
    return data ? mapStaffAccount(data) : null;
  },

  async getRolePermissions(role: EmployeeRole): Promise<Permission[]> {
    if (role === 'developer') return [];
    const { data, error } = await getSupabase()
      .from('role_permissions')
      .select('permission_key')
      .eq('role', role);
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
    return mapStaffAccount(data);
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
    const { data, error } = await getSupabase()
      .from('staff_accounts')
      .select('*')
      .in('status', ['approved', 'disabled'])
      .order('approved_at', { ascending: false });
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map(mapStaffAccount);
  },

  async approve(targetUserId: string, role: Exclude<EmployeeRole, 'developer'>): Promise<StaffAccount> {
    const { data, error } = await getSupabase().rpc('approve_staff_account', {
      target_user_id: targetUserId,
      assigned_role: role,
    });
    if (error) throw mapSupabaseError(error);
    return mapStaffAccount(data);
  },

  async decline(targetUserId: string): Promise<StaffAccount> {
    const { data, error } = await getSupabase().rpc('decline_staff_account', {
      target_user_id: targetUserId,
    });
    if (error) throw mapSupabaseError(error);
    return mapStaffAccount(data);
  },

  async disable(targetUserId: string): Promise<StaffAccount> {
    const { data, error } = await getSupabase().rpc('disable_staff_account', {
      target_user_id: targetUserId,
    });
    if (error) throw mapSupabaseError(error);
    return mapStaffAccount(data);
  },

  async enable(targetUserId: string): Promise<StaffAccount> {
    const { data, error } = await getSupabase().rpc('enable_staff_account', {
      target_user_id: targetUserId,
    });
    if (error) throw mapSupabaseError(error);
    return mapStaffAccount(data);
  },

  async changeRole(targetUserId: string, role: Exclude<EmployeeRole, 'developer'>): Promise<StaffAccount> {
    const { data, error } = await getSupabase().rpc('change_staff_role', {
      target_user_id: targetUserId,
      new_role: role,
    });
    if (error) throw mapSupabaseError(error);
    return mapStaffAccount(data);
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

  async listAllRolePermissions(): Promise<{ role: Exclude<EmployeeRole, 'developer'>; permissionKey: Permission }[]> {
    const { data, error } = await getSupabase().from('role_permissions').select('*');
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map((row) => ({
      role: row.role as Exclude<EmployeeRole, 'developer'>,
      permissionKey: row.permission_key as Permission,
    }));
  },

  async setRolePermission(
    role: Exclude<EmployeeRole, 'developer'>,
    permissionKey: Permission,
    enabled: boolean
  ): Promise<void> {
    const { error } = await getSupabase().rpc('set_role_permission', {
      target_role: role,
      permission_key: permissionKey,
      enabled,
    });
    if (error) throw mapSupabaseError(error);
  },

  async listAuditLog(limit = 100): Promise<AuditLogEntry[]> {
    const { data, error } = await getSupabase()
      .from('staff_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map((row) => ({
      id: row.id,
      actorUserId: row.actor_user_id,
      targetUserId: row.target_user_id,
      action: row.action,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      createdAt: row.created_at,
    }));
  },
};
