import { useEffect, useState } from 'react';
import HeroSection, { type HeroSlide } from '@/components/homepage/HeroSection';
import ShopSection from '@/components/homepage/ShopSection';
import FeaturedCollectionSection from '@/components/homepage/FeaturedCollectionSection';
import PromotionalBannerSection from '@/components/homepage/PromotionalBannerSection';
import { dropService } from '@/services/dropService';
import { collectionService } from '@/services/collectionService';
import { settingsService } from '@/services/settingsService';
import { articleService } from '@/services/articleService';
import type { Article, Collection, Drop, HeroMode, HomepageSection } from '@/types';

function resolveHeroDropIds(section: HomepageSection | undefined): string[] {
  if (!section) return [];
  const ids = section.config.featuredDropIds?.filter(Boolean) ?? [];
  if (ids.length > 0) return ids;
  if (section.config.featuredDropId) return [section.config.featuredDropId];
  return [];
}

function buildDropSlides(
  drops: Drop[],
  ids: string[],
  activeCollections: Collection[],
  heroImage?: string
): HeroSlide[] {
  const selected = ids
    .map((id) => drops.find((d) => d.id === id))
    .filter((d): d is Drop => Boolean(d));

  const source =
    selected.length > 0
      ? selected
      : (() => {
          const featured = drops.filter((d) => d.featuredOnHomepage);
          return featured.length > 0 ? featured : drops.slice(0, 1);
        })();

  return source.map((drop, i) => ({
    kind: 'drop' as const,
    drop,
    image: i === 0 ? heroImage || undefined : undefined,
    collectionSlug: drop.collectionId
      ? activeCollections.find((c) => c.id === drop.collectionId)?.slug
      : undefined,
  }));
}

function buildArticleSlides(articles: Article[], featuredOnly: boolean): HeroSlide[] {
  const list = featuredOnly ? articles.filter((a) => a.featuredOnHomepage) : articles;
  const source = list.length > 0 ? list : articles.filter((a) => a.featuredOnHomepage);
  return source.slice(0, 6).map((article) => ({
    kind: 'article' as const,
    article,
  }));
}

function interleave(a: HeroSlide[], b: HeroSlide[]): HeroSlide[] {
  const out: HeroSlide[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

function resolveHeroSlides(
  mode: HeroMode,
  drops: Drop[],
  articles: Article[],
  dropIds: string[],
  activeCollections: Collection[],
  heroImage?: string
): HeroSlide[] {
  const dropSlides = buildDropSlides(drops, dropIds, activeCollections, heroImage);
  const featuredArticles = buildArticleSlides(articles, true);
  const latestArticles = buildArticleSlides(articles, false);

  switch (mode) {
    case 'drops':
      return dropSlides;
    case 'featured_articles':
      return featuredArticles.length > 0 ? featuredArticles : dropSlides;
    case 'mixed':
      return interleave(featuredArticles, dropSlides).length > 0
        ? interleave(featuredArticles, dropSlides)
        : dropSlides;
    case 'articles_first':
    default: {
      const articlesFirst = featuredArticles.length > 0 ? featuredArticles : latestArticles.slice(0, 3);
      if (articlesFirst.length === 0) return dropSlides;
      return [...articlesFirst, ...dropSlides];
    }
  }
}

export default function HomePage() {
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [featuredCollection, setFeaturedCollection] = useState<Collection | null>(null);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [bannerText, setBannerText] = useState('EST. 2026 — FOOTWEAR / APPAREL / CULTURE');
  const [bannerImage, setBannerImage] = useState('');

  useEffect(() => {
    Promise.all([
      dropService.getAll(),
      collectionService.getActive(),
      settingsService.getHomepageContent(),
      articleService.getPublished(),
    ]).then(([drops, activeCollections, content, articles]) => {
      setSections(content.sections);

      const heroSection = content.sections.find((s) => s.type === 'hero' && s.enabled);
      const configuredIds = resolveHeroDropIds(heroSection);
      const mode: HeroMode = heroSection?.config.heroMode ?? 'articles_first';

      setHeroSlides(
        resolveHeroSlides(
          mode,
          drops,
          articles,
          configuredIds,
          activeCollections,
          heroSection?.config.heroImage
        )
      );

      const featuredSection = content.sections.find((s) => s.type === 'featured-collection' && s.enabled);
      if (featuredSection?.config.featuredCollectionId) {
        const col = activeCollections.find((c) => c.id === featuredSection.config.featuredCollectionId);
        setFeaturedCollection(col ?? activeCollections[0] ?? null);
      } else {
        setFeaturedCollection(activeCollections[0] ?? null);
      }

      const bannerSection = content.sections.find((s) => s.type === 'promotional-banner' && s.enabled);
      if (bannerSection) {
        setBannerText(bannerSection.config.bannerText ?? 'EST. 2026 — FOOTWEAR / APPAREL / CULTURE');
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
            return heroSlides.length > 0 && <HeroSection key={section.id} slides={heroSlides} />;
          case 'shop':
            return (
              <ShopSection
                key={section.id}
                featuredProductIds={section.config.featuredProductIds}
              />
            );
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
