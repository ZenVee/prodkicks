import { useEffect, useState } from 'react';
import HeroSection from '@/components/homepage/HeroSection';
import UpcomingDropSection from '@/components/homepage/UpcomingDropSection';
import ShopSection from '@/components/homepage/ShopSection';
import FeaturedCollectionSection from '@/components/homepage/FeaturedCollectionSection';
import PromotionalBannerSection from '@/components/homepage/PromotionalBannerSection';
import { dropService } from '@/services/dropService';
import { collectionService } from '@/services/collectionService';
import { settingsService } from '@/services/settingsService';
import type { Drop, Collection, HomepageSection } from '@/types';

export default function HomePage() {
  const [activeDrop, setActiveDrop] = useState<Drop | null>(null);
  const [upcomingDrop, setUpcomingDrop] = useState<Drop | null>(null);
  const [featuredCollection, setFeaturedCollection] = useState<Collection | null>(null);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [bannerText, setBannerText] = useState('EST. 2026 — FOOTWEAR / APPAREL / CULTURE');
  const [bannerImage, setBannerImage] = useState('');

  useEffect(() => {
    Promise.all([
      dropService.getFeatured(),
      dropService.getUpcomingFeatured(),
      collectionService.getActive(),
      settingsService.getHomepageContent(),
    ]).then(([active, upcoming, collections, content]) => {
      setActiveDrop(active);
      setUpcomingDrop(upcoming);
      setSections(content.sections);

      const featuredSection = content.sections.find((s) => s.type === 'featured-collection' && s.enabled);
      if (featuredSection?.config.featuredCollectionId) {
        const col = collections.find((c) => c.id === featuredSection.config.featuredCollectionId);
        setFeaturedCollection(col ?? collections[0] ?? null);
      } else {
        setFeaturedCollection(collections[0] ?? null);
      }

      const bannerSection = content.sections.find((s) => s.type === 'promotional-banner' && s.enabled);
      if (bannerSection) {
        setBannerText(bannerSection.config.bannerText ?? bannerText);
        setBannerImage(bannerSection.config.bannerImage ?? '');
      }
    });
  }, []);

  const enabledSections = sections.filter((s) => s.enabled).sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <>
      {enabledSections.map((section) => {
        switch (section.type) {
          case 'hero':
            return activeDrop && <HeroSection key={section.id} drop={activeDrop} />;
          case 'upcoming-drop':
            return upcomingDrop && section.config.featuredDropId && (
              <UpcomingDropSection key={section.id} drop={upcomingDrop} />
            );
          case 'shop':
            return <ShopSection key={section.id} />;
          case 'featured-collection':
            return featuredCollection && (
              <FeaturedCollectionSection key={section.id} collection={featuredCollection} />
            );
          case 'promotional-banner':
            return (
              <PromotionalBannerSection
                key={section.id}
                text={bannerText}
                image={bannerImage}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
