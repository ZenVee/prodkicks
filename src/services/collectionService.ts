import type { Collection } from '@/types';
import type { Database } from '@/types/database';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapSupabaseError } from '@/utils/errors';
import { mockCollections } from '@/data/collections';

type CollectionRow = Database['public']['Tables']['collections']['Row'];

let localCollections = [...mockCollections];

function fromRow(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    campaignImage: row.campaign_image,
    campaignHeadline: row.campaign_headline,
    campaignSubtitle: row.campaign_subtitle,
    displayOrder: row.display_order,
    productIds: row.product_ids ?? [],
    archived: row.archived,
    createdAt: row.created_at,
  };
}

export const collectionService = {
  async getAll(): Promise<Collection[]> {
    if (!isSupabaseConfigured) return [...localCollections];
    const { data, error } = await getSupabase().from('collections').select('*').order('display_order');
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map(fromRow);
  },

  async getActive(): Promise<Collection[]> {
    const all = await this.getAll();
    return all.filter((c) => !c.archived);
  },

  async getById(id: string): Promise<Collection | null> {
    if (!isSupabaseConfigured) return localCollections.find((c) => c.id === id) ?? null;
    const { data, error } = await getSupabase().from('collections').select('*').eq('id', id).maybeSingle();
    if (error) throw mapSupabaseError(error);
    return data ? fromRow(data) : null;
  },

  async getBySlug(slug: string): Promise<Collection | null> {
    if (!isSupabaseConfigured) return localCollections.find((c) => c.slug === slug) ?? null;
    const { data, error } = await getSupabase().from('collections').select('*').eq('slug', slug).maybeSingle();
    if (error) throw mapSupabaseError(error);
    return data ? fromRow(data) : null;
  },

  async create(data: Partial<Collection>): Promise<Collection> {
    const id = `c${Date.now()}`;
    if (!isSupabaseConfigured) {
      const newCollection: Collection = {
        id,
        name: data.name ?? 'Untitled Collection',
        slug: data.slug ?? data.name?.toLowerCase().replace(/\s+/g, '-') ?? 'untitled',
        description: data.description ?? '',
        campaignImage: data.campaignImage ?? '',
        campaignHeadline: data.campaignHeadline ?? '',
        campaignSubtitle: data.campaignSubtitle ?? '',
        displayOrder: data.displayOrder ?? localCollections.length + 1,
        productIds: data.productIds ?? [],
        archived: false,
        createdAt: new Date().toISOString(),
      };
      localCollections = [...localCollections, newCollection];
      return newCollection;
    }
    const { data: row, error } = await getSupabase()
      .from('collections')
      .insert({
        id,
        name: data.name ?? 'Untitled Collection',
        slug: data.slug ?? 'untitled',
        description: data.description ?? '',
        campaign_image: data.campaignImage ?? '',
        campaign_headline: data.campaignHeadline ?? '',
        campaign_subtitle: data.campaignSubtitle ?? '',
        display_order: data.displayOrder ?? 0,
        product_ids: data.productIds ?? [],
        archived: false,
      })
      .select('*')
      .single();
    if (error) throw mapSupabaseError(error);
    return fromRow(row);
  },

  async update(id: string, data: Partial<Collection>): Promise<Collection | null> {
    if (!isSupabaseConfigured) {
      const idx = localCollections.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      localCollections[idx] = { ...localCollections[idx], ...data };
      return localCollections[idx];
    }
    const update: Database['public']['Tables']['collections']['Update'] = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.slug !== undefined) update.slug = data.slug;
    if (data.description !== undefined) update.description = data.description;
    if (data.campaignImage !== undefined) update.campaign_image = data.campaignImage;
    if (data.campaignHeadline !== undefined) update.campaign_headline = data.campaignHeadline;
    if (data.campaignSubtitle !== undefined) update.campaign_subtitle = data.campaignSubtitle;
    if (data.displayOrder !== undefined) update.display_order = data.displayOrder;
    if (data.productIds !== undefined) update.product_ids = data.productIds;
    if (data.archived !== undefined) update.archived = data.archived;
    const { data: row, error } = await getSupabase().from('collections').update(update).eq('id', id).select('*').maybeSingle();
    if (error) throw mapSupabaseError(error);
    return row ? fromRow(row) : null;
  },

  async archive(id: string): Promise<Collection | null> {
    return this.update(id, { archived: true });
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const before = localCollections.length;
      localCollections = localCollections.filter((c) => c.id !== id);
      return localCollections.length < before;
    }
    const { error } = await getSupabase().from('collections').delete().eq('id', id);
    if (error) throw mapSupabaseError(error);
    return true;
  },
};
