import type { Drop } from '@/types';
import type { Database } from '@/types/database';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapSupabaseError } from '@/utils/errors';
import { mockDrops } from '@/data/drops';

type DropRow = Database['public']['Tables']['drops']['Row'];

let localDrops = [...mockDrops];

function fromRow(row: DropRow): Drop {
  return {
    id: row.id,
    name: row.name,
    dropNumber: row.drop_number,
    collectionId: row.collection_id,
    releaseDate: row.release_date,
    releaseTime: row.release_time,
    campaignHeadline: row.campaign_headline,
    campaignSubtitle: row.campaign_subtitle,
    campaignDescription: row.campaign_description,
    heroImage: row.hero_image,
    heroLabel: row.hero_label,
    showCountdown: row.show_countdown,
    featuredOnHomepage: row.featured_on_homepage,
    status: row.status as Drop['status'],
    season: row.season,
  };
}

export const dropService = {
  async getAll(): Promise<Drop[]> {
    if (!isSupabaseConfigured) return [...localDrops];
    const { data, error } = await getSupabase().from('drops').select('*').order('drop_number', { ascending: false });
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map(fromRow);
  },

  async getUpcoming(): Promise<Drop[]> {
    const all = await this.getAll();
    return all.filter((d) => d.status === 'upcoming');
  },

  async getActive(): Promise<Drop[]> {
    const all = await this.getAll();
    return all.filter((d) => d.status === 'active');
  },

  async getPrevious(): Promise<Drop[]> {
    const all = await this.getAll();
    return all.filter((d) => d.status === 'previous');
  },

  async getById(id: string): Promise<Drop | null> {
    if (!isSupabaseConfigured) return localDrops.find((d) => d.id === id) ?? null;
    const { data, error } = await getSupabase().from('drops').select('*').eq('id', id).maybeSingle();
    if (error) throw mapSupabaseError(error);
    return data ? fromRow(data) : null;
  },

  async getFeatured(): Promise<Drop | null> {
    const all = await this.getAll();
    return all.find((d) => d.featuredOnHomepage && d.status === 'active') ?? null;
  },

  async create(data: Partial<Drop>): Promise<Drop> {
    const id = `d${Date.now()}`;
    if (!isSupabaseConfigured) {
      const newDrop: Drop = {
        id,
        name: data.name ?? 'Untitled Drop',
        dropNumber: data.dropNumber ?? localDrops.length + 1,
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
      localDrops = [newDrop, ...localDrops];
      return newDrop;
    }
    const { data: row, error } = await getSupabase()
      .from('drops')
      .insert({
        id,
        name: data.name ?? 'Untitled Drop',
        drop_number: data.dropNumber ?? 1,
        collection_id: data.collectionId ?? null,
        release_date: data.releaseDate ?? new Date().toISOString().split('T')[0],
        release_time: data.releaseTime ?? '8:00 PM',
        campaign_headline: data.campaignHeadline ?? '',
        campaign_subtitle: data.campaignSubtitle ?? '',
        campaign_description: data.campaignDescription ?? '',
        hero_image: data.heroImage ?? '',
        hero_label: data.heroLabel ?? '',
        show_countdown: data.showCountdown ?? true,
        featured_on_homepage: data.featuredOnHomepage ?? false,
        status: data.status ?? 'upcoming',
        season: data.season ?? '',
      })
      .select('*')
      .single();
    if (error) throw mapSupabaseError(error);
    return fromRow(row);
  },

  async update(id: string, data: Partial<Drop>): Promise<Drop | null> {
    if (!isSupabaseConfigured) {
      const idx = localDrops.findIndex((d) => d.id === id);
      if (idx === -1) return null;
      localDrops[idx] = { ...localDrops[idx], ...data };
      return localDrops[idx];
    }
    const update: Database['public']['Tables']['drops']['Update'] = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.dropNumber !== undefined) update.drop_number = data.dropNumber;
    if (data.collectionId !== undefined) update.collection_id = data.collectionId;
    if (data.releaseDate !== undefined) update.release_date = data.releaseDate;
    if (data.releaseTime !== undefined) update.release_time = data.releaseTime;
    if (data.campaignHeadline !== undefined) update.campaign_headline = data.campaignHeadline;
    if (data.campaignSubtitle !== undefined) update.campaign_subtitle = data.campaignSubtitle;
    if (data.campaignDescription !== undefined) update.campaign_description = data.campaignDescription;
    if (data.heroImage !== undefined) update.hero_image = data.heroImage;
    if (data.heroLabel !== undefined) update.hero_label = data.heroLabel;
    if (data.showCountdown !== undefined) update.show_countdown = data.showCountdown;
    if (data.featuredOnHomepage !== undefined) update.featured_on_homepage = data.featuredOnHomepage;
    if (data.status !== undefined) update.status = data.status;
    if (data.season !== undefined) update.season = data.season;
    const { data: row, error } = await getSupabase().from('drops').update(update).eq('id', id).select('*').maybeSingle();
    if (error) throw mapSupabaseError(error);
    return row ? fromRow(row) : null;
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const before = localDrops.length;
      localDrops = localDrops.filter((d) => d.id !== id);
      return localDrops.length < before;
    }
    const { error } = await getSupabase().from('drops').delete().eq('id', id);
    if (error) throw mapSupabaseError(error);
    return true;
  },

  async countByStatus(status: Drop['status']): Promise<number> {
    const all = await this.getAll();
    return all.filter((d) => d.status === status).length;
  },

  async getRecent(limit = 5): Promise<Drop[]> {
    const all = await this.getAll();
    return all.slice(0, limit);
  },
};
