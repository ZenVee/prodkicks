import type { StaffMember, StaffRole } from '@/types';
import type { Database } from '@/types/database';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapSupabaseError } from '@/utils/errors';
import { mockStaff } from '@/data/staff';

type TeamRow = Database['public']['Tables']['team_members']['Row'];

let localStaff = [...mockStaff];

function fromRow(row: TeamRow): StaffMember {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    role: row.role as StaffRole,
    bio: row.bio,
    photo: row.photo,
    showOnWebsite: row.show_on_website,
    displayOrder: row.display_order,
  };
}

export const staffService = {
  async getAll(): Promise<StaffMember[]> {
    if (!isSupabaseConfigured) return [...localStaff];
    const { data, error } = await getSupabase().from('team_members').select('*').order('display_order');
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map(fromRow);
  },

  async getPublic(): Promise<StaffMember[]> {
    const all = await this.getAll();
    return all.filter((s) => s.showOnWebsite);
  },

  async getByRole(role: StaffRole): Promise<StaffMember[]> {
    const all = await this.getAll();
    return all.filter((s) => s.role === role);
  },

  async getById(id: string): Promise<StaffMember | null> {
    if (!isSupabaseConfigured) return localStaff.find((s) => s.id === id) ?? null;
    const { data, error } = await getSupabase().from('team_members').select('*').eq('id', id).maybeSingle();
    if (error) throw mapSupabaseError(error);
    return data ? fromRow(data) : null;
  },

  async create(data: Partial<StaffMember>): Promise<StaffMember> {
    const id = `s${Date.now()}`;
    if (!isSupabaseConfigured) {
      const newMember: StaffMember = {
        id,
        name: data.name ?? 'New Member',
        position: data.position ?? 'Staff',
        role: data.role ?? 'staff',
        bio: data.bio ?? '',
        photo: data.photo ?? '',
        showOnWebsite: data.showOnWebsite ?? true,
        displayOrder: data.displayOrder ?? localStaff.length + 1,
      };
      localStaff = [...localStaff, newMember];
      return newMember;
    }
    const { data: row, error } = await getSupabase()
      .from('team_members')
      .insert({
        id,
        name: data.name ?? 'New Member',
        position: data.position ?? 'Staff',
        role: data.role ?? 'staff',
        bio: data.bio ?? '',
        photo: data.photo ?? '',
        show_on_website: data.showOnWebsite ?? true,
        display_order: data.displayOrder ?? 0,
      })
      .select('*')
      .single();
    if (error) throw mapSupabaseError(error);
    return fromRow(row);
  },

  async update(id: string, data: Partial<StaffMember>): Promise<StaffMember | null> {
    if (!isSupabaseConfigured) {
      const idx = localStaff.findIndex((s) => s.id === id);
      if (idx === -1) return null;
      localStaff[idx] = { ...localStaff[idx], ...data };
      return localStaff[idx];
    }
    const update: Database['public']['Tables']['team_members']['Update'] = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.position !== undefined) update.position = data.position;
    if (data.role !== undefined) update.role = data.role;
    if (data.bio !== undefined) update.bio = data.bio;
    if (data.photo !== undefined) update.photo = data.photo;
    if (data.showOnWebsite !== undefined) update.show_on_website = data.showOnWebsite;
    if (data.displayOrder !== undefined) update.display_order = data.displayOrder;
    const { data: row, error } = await getSupabase().from('team_members').update(update).eq('id', id).select('*').maybeSingle();
    if (error) throw mapSupabaseError(error);
    return row ? fromRow(row) : null;
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const before = localStaff.length;
      localStaff = localStaff.filter((s) => s.id !== id);
      return localStaff.length < before;
    }
    const { error } = await getSupabase().from('team_members').delete().eq('id', id);
    if (error) throw mapSupabaseError(error);
    return true;
  },

  async count(): Promise<number> {
    const all = await this.getAll();
    return all.length;
  },
};
