import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { SiteSettings } from '@/types';
import { mockSettings } from '@/data/settings';
import { settingsService } from '@/services/settingsService';

interface SiteSettingsContextValue {
  settings: SiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);

function applyDocumentMeta(settings: SiteSettings) {
  if (settings.seoTitle) {
    document.title = settings.seoTitle;
  }
  const description = document.querySelector('meta[name="description"]');
  if (description && settings.seoDescription) {
    description.setAttribute('content', settings.seoDescription);
  }
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(mockSettings);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const next = await settingsService.getSettings();
      setSettings(next);
      applyDocumentMeta(next);
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error('useSiteSettings must be used within SiteSettingsProvider');
  return ctx;
}
