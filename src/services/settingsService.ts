import type { SiteSettings, HomepageContent } from '@/types';
import { mockSettings, mockHomepageContent } from '@/data/settings';

let settings = { ...mockSettings };
let homepageContent = { ...mockHomepageContent };

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 100));
}

export const settingsService = {
  async getSettings(): Promise<SiteSettings> {
    return delay({ ...settings });
  },

  async updateSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
    settings = { ...settings, ...data };
    return delay({ ...settings });
  },

  async getHomepageContent(): Promise<HomepageContent> {
    return delay({ ...homepageContent });
  },

  async updateHomepageContent(data: HomepageContent): Promise<HomepageContent> {
    homepageContent = { ...data };
    return delay({ ...homepageContent });
  },
};
