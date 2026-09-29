import type { SiteSettings, HomepageContent, User } from '@/types';

export const mockSettings: SiteSettings = {
  companyName: 'Prod Kicks',
  tagline: 'Footwear / Apparel / Culture',
  establishedYear: '2026',
  currencySymbol: '$',
  footerText: 'Prod Kicks is a modern sneaker and streetwear retailer. Footwear, apparel, culture.',
  socialLinks: {
    instagram: 'https://instagram.com',
    twitter: 'https://twitter.com',
    youtube: 'https://youtube.com',
  },
  discordUrl: 'https://discord.com',
  seoTitle: 'PROD KICKS® — Footwear / Apparel / Culture',
  seoDescription: 'Prod Kicks is a modern sneaker and streetwear retailer. Footwear, apparel, culture.',
};

export const mockHomepageContent: HomepageContent = {
  sections: [
    {
      id: 'hs1',
      type: 'hero',
      title: 'Hero / Latest Drop',
      enabled: true,
      displayOrder: 1,
      config: {
        featuredDropId: 'd1',
        heroImage: 'https://images.pexels.com/photos/13873170/pexels-photo-13873170.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      },
    },
    {
      id: 'hs2',
      type: 'upcoming-drop',
      title: 'Upcoming Drop',
      enabled: true,
      displayOrder: 2,
      config: {
        featuredDropId: 'd2',
      },
    },
    {
      id: 'hs3',
      type: 'shop',
      title: 'Shop',
      enabled: true,
      displayOrder: 3,
      config: {
        featuredProductIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8', 'p10'],
      },
    },
    {
      id: 'hs4',
      type: 'featured-collection',
      title: 'Featured Collection',
      enabled: true,
      displayOrder: 4,
      config: {
        featuredCollectionId: 'c1',
      },
    },
    {
      id: 'hs5',
      type: 'promotional-banner',
      title: 'Promotional Banner',
      enabled: true,
      displayOrder: 5,
      config: {
        bannerText: 'EST. 2026 — FOOTWEAR / APPAREL / CULTURE',
        bannerImage: 'https://images.pexels.com/photos/5629659/pexels-photo-5629659.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      },
    },
  ],
};

export const mockUser: User = {
  id: 'u1',
  name: 'Marcus Cole',
  email: 'marcus@prodkicks.com',
  avatar: 'https://images.pexels.com/photos/21939625/pexels-photo-21939625.jpeg?auto=compress&cs=tinysrgb&h=120&w=120',
  role: 'owner',
  position: 'Founder & Creative Director',
};
