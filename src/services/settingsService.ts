import type { SiteSettings, HomepageContent, HomepageSection, ProductCategoryDef } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapSupabaseError } from '@/utils/errors';
import { mockSettings, mockHomepageContent } from '@/data/settings';
import { DEFAULT_PRODUCT_CATEGORIES, normalizeProductCategoryIcon } from '@/data/productCategories';
import type { Json } from '@/types/database';

let settings = { ...mockSettings, productCategories: mockSettings.productCategories.map((c) => ({ ...c })) };
let homepageContent: HomepageContent = { sections: [...mockHomepageContent.sections] };

function normalizeCategories(raw: unknown): ProductCategoryDef[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_PRODUCT_CATEGORIES.map((c) => ({ ...c }));
  }

  const seen = new Set<string>();
  const next: ProductCategoryDef[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const label = String(row.label ?? '').trim();
    const slug = String(row.slug ?? '')
      .trim()
      .toLowerCase();
    if (!label || !slug || seen.has(slug)) continue;
    seen.add(slug);
    next.push({
      id: String(row.id ?? `cat_${slug}`),
      slug,
      label,
      icon: normalizeProductCategoryIcon(row.icon),
    });
  }

  return next.length > 0 ? next : DEFAULT_PRODUCT_CATEGORIES.map((c) => ({ ...c }));
}

function mapSettingsRow(data: {
  company_name: string;
  tagline: string;
  established_year: string;
  currency_symbol: string;
  footer_text: string;
  seo_title: string;
  seo_description: string;
  commission_percentage?: number | string | null;
  product_categories?: unknown;
}): SiteSettings {
  return {
    companyName: data.company_name,
    tagline: data.tagline,
    establishedYear: data.established_year,
    currencySymbol: data.currency_symbol,
    footerText: data.footer_text,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    commissionPercentage: Number(data.commission_percentage ?? 0),
    productCategories: normalizeCategories(data.product_categories),
  };
}

export const settingsService = {
  async getSettings(): Promise<SiteSettings> {
    if (!isSupabaseConfigured) {
      return {
        ...settings,
        productCategories: settings.productCategories.map((c) => ({ ...c })),
      };
    }
    const { data, error } = await getSupabase().from('site_settings').select('*').eq('id', 'main').maybeSingle();
    if (error) throw mapSupabaseError(error);
    if (!data) {
      return {
        ...settings,
        productCategories: settings.productCategories.map((c) => ({ ...c })),
      };
    }
    const mapped = mapSettingsRow(data);
    settings = mapped;
    return {
      ...mapped,
      productCategories: mapped.productCategories.map((c) => ({ ...c })),
    };
  },

  async updateSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = await this.getSettings();
    const next: SiteSettings = {
      ...current,
      ...data,
      productCategories: normalizeCategories(data.productCategories ?? current.productCategories),
    };

    if (!isSupabaseConfigured) {
      settings = next;
      return {
        ...settings,
        productCategories: settings.productCategories.map((c) => ({ ...c })),
      };
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
        commission_percentage: next.commissionPercentage,
        product_categories: next.productCategories as unknown as Json,
      })
      .select('*')
      .single();
    if (error) throw mapSupabaseError(error);
    const mapped = mapSettingsRow(row);
    settings = mapped;
    return {
      ...mapped,
      productCategories: mapped.productCategories.map((c) => ({ ...c })),
    };
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
      .upsert({ id: 'main', sections: data.sections as unknown as Json })
      .select('*')
      .single();
    if (error) throw mapSupabaseError(error);
    return { sections: (row.sections as unknown as HomepageSection[]) ?? [] };
  },
};
