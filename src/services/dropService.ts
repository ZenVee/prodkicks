import type { Drop } from '@/types';
import { mockDrops } from '@/data/drops';

let drops = [...mockDrops];

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 100));
}

export const dropService = {
  async getAll(): Promise<Drop[]> {
    return delay([...drops]);
  },

  async getUpcoming(): Promise<Drop[]> {
    return delay(drops.filter((d) => d.status === 'upcoming'));
  },

  async getActive(): Promise<Drop[]> {
    return delay(drops.filter((d) => d.status === 'active'));
  },

  async getPrevious(): Promise<Drop[]> {
    return delay(drops.filter((d) => d.status === 'previous'));
  },

  async getById(id: string): Promise<Drop | null> {
    return delay(drops.find((d) => d.id === id) ?? null);
  },

  async getFeatured(): Promise<Drop | null> {
    return delay(drops.find((d) => d.featuredOnHomepage && d.status === 'active') ?? null);
  },

  async getUpcomingFeatured(): Promise<Drop | null> {
    return delay(drops.find((d) => d.featuredOnHomepage && d.status === 'upcoming') ?? null);
  },

  async create(data: Partial<Drop>): Promise<Drop> {
    const newDrop: Drop = {
      id: `d${Date.now()}`,
      name: data.name ?? 'Untitled Drop',
      dropNumber: data.dropNumber ?? drops.length + 1,
      collectionId: data.collectionId ?? null,
      releaseDate: data.releaseDate ?? new Date().toISOString().split('T')[0],
      releaseTime: data.releaseTime ?? '8:00 PM',
      campaignHeadline: data.campaignHeadline ?? '',
      campaignSubtitle: data.campaignSubtitle ?? '',
      campaignDescription: data.campaignDescription ?? '',
      heroImage: data.heroImage ?? '',
      heroLabel: data.heroLabel ?? `DROP ${String(data.dropNumber ?? '').padStart(3, '0')}`,
      showCountdown: data.showCountdown ?? true,
      featuredOnHomepage: data.featuredOnHomepage ?? false,
      status: data.status ?? 'upcoming',
      season: data.season ?? '',
    };
    drops = [newDrop, ...drops];
    return delay(newDrop);
  },

  async update(id: string, data: Partial<Drop>): Promise<Drop | null> {
    const idx = drops.findIndex((d) => d.id === id);
    if (idx === -1) return delay(null);
    drops[idx] = { ...drops[idx], ...data };
    return delay(drops[idx]);
  },

  async delete(id: string): Promise<boolean> {
    const before = drops.length;
    drops = drops.filter((d) => d.id !== id);
    return delay(drops.length < before);
  },

  async countByStatus(status: Drop['status']): Promise<number> {
    return delay(drops.filter((d) => d.status === status).length);
  },

  async getRecent(limit = 5): Promise<Drop[]> {
    return delay([...drops].slice(0, limit));
  },
};
