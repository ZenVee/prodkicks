import type { StaffMember, StaffRole } from '@/types';
import { mockStaff } from '@/data/staff';

let staff = [...mockStaff];

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 100));
}

export const staffService = {
  async getAll(): Promise<StaffMember[]> {
    return delay([...staff]);
  },

  async getPublic(): Promise<StaffMember[]> {
    return delay(staff.filter((s) => s.showOnWebsite));
  },

  async getByRole(role: StaffRole): Promise<StaffMember[]> {
    return delay(staff.filter((s) => s.role === role));
  },

  async getById(id: string): Promise<StaffMember | null> {
    return delay(staff.find((s) => s.id === id) ?? null);
  },

  async create(data: Partial<StaffMember>): Promise<StaffMember> {
    const newMember: StaffMember = {
      id: `s${Date.now()}`,
      name: data.name ?? 'New Member',
      position: data.position ?? 'Staff',
      role: data.role ?? 'staff',
      bio: data.bio ?? '',
      photo: data.photo ?? '',
      showOnWebsite: data.showOnWebsite ?? true,
      displayOrder: data.displayOrder ?? staff.length + 1,
    };
    staff = [...staff, newMember];
    return delay(newMember);
  },

  async update(id: string, data: Partial<StaffMember>): Promise<StaffMember | null> {
    const idx = staff.findIndex((s) => s.id === id);
    if (idx === -1) return delay(null);
    staff[idx] = { ...staff[idx], ...data };
    return delay(staff[idx]);
  },

  async delete(id: string): Promise<boolean> {
    const before = staff.length;
    staff = staff.filter((s) => s.id !== id);
    return delay(staff.length < before);
  },

  async count(): Promise<number> {
    return delay(staff.length);
  },
};
