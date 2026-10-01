import type { SiteSettings, HomepageContent, HomepageSection } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapSupabaseError } from '@/utils/errors';
import { mockSettings, mockHomepageContent } from '@/data/settings';

let settings = { ...mockSettings };
let homepageContent: HomepageContent = { sections: [...mockHomepageContent.sections] };

function mapSettingsRow(data: {
  company_name: string;
  tagline: string;
  established_year: string;
  currency_symbol: string;
  footer_text: string;
  seo_title: string;
  seo_description: string;
}): SiteSettings {
  return {
    companyName: data.company_name,
    tagline: data.tagline,
    establishedYear: data.established_year,
    currencySymbol: data.currency_symbol,
    footerText: data.footer_text,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
  };
}

export const settingsService = {
  async getSettings(): Promise<SiteSettings> {
    if (!isSupabaseConfigured) return { ...settings };
    const { data, error } = await getSupabase().from('site_settings').select('*').eq('id', 'main').maybeSingle();
    if (error) throw mapSupabaseError(error);
    if (!data) return { ...settings };
    const mapped = mapSettingsRow(data);
    settings = mapped;
    return { ...mapped };
  },

  async updateSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = await this.getSettings();
    const next: SiteSettings = { ...current, ...data };

    if (!isSupabaseConfigured) {
      settings = next;
      return { ...settings };
    }

    const { data: row, error } = await getSupabase()
      .from('site_settings')
      .upsert({
        id: 'main',
        company_name: next.companyName,
        tagline: next.tagline,
        established_year: next.establishedYear,
        currency_symbol: next.currencySymbol,
        footer_text: next.footerText,
        seo_title: next.seoTitle,
        seo_description: next.seoDescription,
      })
      .select('*')
      .single();
    if (error) throw mapSupabaseError(error);
    const mapped = mapSettingsRow(row);
    settings = mapped;
    return { ...mapped };
  },

  async getHomepageContent(): Promise<HomepageContent> {
    if (!isSupabaseConfigured) return { sections: [...homepageContent.sections] };
    const { data, error } = await getSupabase().from('homepage_content').select('*').eq('id', 'main').maybeSingle();
    if (error) throw mapSupabaseError(error);
    return {
      sections: ((data?.sections as unknown as HomepageSection[]) ?? homepageContent.sections).map((s) => ({ ...s })),
    };
  },

  async updateHomepageContent(data: HomepageContent): Promise<HomepageContent> {
    if (!isSupabaseConfigured) {
      homepageContent = { sections: [...data.sections] };
      return { sections: [...homepageContent.sections] };
    }
    const { data: row, error } = await getSupabase()
      .from('homepage_content')
      .upsert({ id: 'main', sections: data.sections as unknown as import('@/types/database').Json })
      .select('*')
      .single();
    if (error) throw mapSupabaseError(error);
    return { sections: (row.sections as unknown as HomepageSection[]) ?? [] };
  },
};
