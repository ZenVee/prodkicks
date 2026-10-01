import { useEffect, useState } from 'react';
import type { SiteSettings } from '@/types';
import { settingsService } from '@/services/settingsService';
import { useToast } from '@/hooks/useToast';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export default function PortalSettings() {
  const { showToast } = useToast();
  const { refreshSettings } = useSiteSettings();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsService.getSettings().then(setSettings);
  }, []);

  if (!settings) return <p className="text-sm text-bone-muted">Loading...</p>;

  const update = <K extends keyof SiteSettings>(field: K, value: SiteSettings[K]) => {
    setSettings((prev) => ({ ...prev!, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await settingsService.updateSettings(settings);
      setSettings(saved);
      await refreshSettings();
      showToast('Settings saved', 'success');
    } catch {
      showToast('Could not save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone mb-1">Settings</h1>
      <p className="text-sm text-bone-muted mb-8">Configure your site-wide settings.</p>

      <div className="space-y-6">
        <div className="bg-ink-surface border border-white/5 p-6">
          <h2 className="text-sm tracking-wider uppercase text-bone-muted mb-4">Company</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Company Name</label>
              <input type="text" value={settings.companyName} onChange={(e) => update('companyName', e.target.value)} className="portal-input" />
            </div>
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Tagline</label>
              <input type="text" value={settings.tagline} onChange={(e) => update('tagline', e.target.value)} className="portal-input" />
            </div>
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Established Year</label>
              <input type="text" value={settings.establishedYear} onChange={(e) => update('establishedYear', e.target.value)} className="portal-input" />
            </div>
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Currency Symbol</label>
              <input type="text" value={settings.currencySymbol} onChange={(e) => update('currencySymbol', e.target.value)} className="portal-input" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Footer Text</label>
            <textarea value={settings.footerText} onChange={(e) => update('footerText', e.target.value)} rows={2} className="portal-input resize-none" />
          </div>
        </div>

        <div className="bg-ink-surface border border-white/5 p-6">
          <h2 className="text-sm tracking-wider uppercase text-bone-muted mb-4">SEO</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Default SEO Title</label>
              <input type="text" value={settings.seoTitle} onChange={(e) => update('seoTitle', e.target.value)} className="portal-input" />
            </div>
            <div>
              <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Default SEO Description</label>
              <textarea value={settings.seoDescription} onChange={(e) => update('seoDescription', e.target.value)} rows={2} className="portal-input resize-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-lime text-ink text-sm font-medium tracking-wider uppercase hover:bg-lime-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
