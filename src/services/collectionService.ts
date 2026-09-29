import type { Collection } from '@/types';
import { mockCollections } from '@/data/collections';

let collections = [...mockCollections];

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 100));
}

export const collectionService = {
  async getAll(): Promise<Collection[]> {
    return delay([...collections]);
  },

  async getActive(): Promise<Collection[]> {
    return delay(collections.filter((c) => !c.archived));
  },

  async getById(id: string): Promise<Collection | null> {
    return delay(collections.find((c) => c.id === id) ?? null);
  },

  async getBySlug(slug: string): Promise<Collection | null> {
    return delay(collections.find((c) => c.slug === slug) ?? null);
  },

  async create(data: Partial<Collection>): Promise<Collection> {
    const newCollection: Collection = {
      id: `c${Date.now()}`,
      name: data.name ?? 'Untitled Collection',
      slug: data.slug ?? data.name?.toLowerCase().replace(/\s+/g, '-') ?? 'untitled',
      description: data.description ?? '',
      campaignImage: data.campaignImage ?? '',
      campaignHeadline: data.campaignHeadline ?? '',
      campaignSubtitle: data.campaignSubtitle ?? '',
      displayOrder: data.displayOrder ?? collections.length + 1,
      productIds: data.productIds ?? [],
      archived: false,
      createdAt: new Date().toISOString(),
    };
    collections = [...collections, newCollection];
    return delay(newCollection);
  },

  async update(id: string, data: Partial<Collection>): Promise<Collection | null> {
    const idx = collections.findIndex((c) => c.id === id);
    if (idx === -1) return delay(null);
    collections[idx] = { ...collections[idx], ...data };
    return delay(collections[idx]);
  },

  async archive(id: string): Promise<Collection | null> {
    return this.update(id, { archived: true });
  },

  async delete(id: string): Promise<boolean> {
    const before = collections.length;
    collections = collections.filter((c) => c.id !== id);
    return delay(collections.length < before);
  },
};
