export type ProductCategory = 'footwear' | 'tops' | 'bottoms' | 'accessories';

export type ProductStatus = 'draft' | 'published' | 'archived';

export type ProductAvailability = 'available' | 'limited' | 'coming-soon' | 'sold-out';

export type ProductLabel = 'new' | 'limited' | 'featured';

export type ProductBadge = 'NEW' | 'LIMITED' | 'COMING SOON' | 'SOLD OUT';

export interface ProductVariant {
  id: string;
  label: string;
  inStock: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category: ProductCategory;
  price: number;
  currency: string;
  color: string;
  description: string;
  status: ProductStatus;
  availability: ProductAvailability;
  labels: ProductLabel[];
  collectionId: string | null;
  variants: ProductVariant[];
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  campaignImage: string;
  campaignHeadline: string;
  campaignSubtitle: string;
  displayOrder: number;
  productIds: string[];
  archived: boolean;
  createdAt: string;
}

export interface Drop {
  id: string;
  name: string;
  dropNumber: number;
  collectionId: string | null;
  releaseDate: string;
  releaseTime: string;
  campaignHeadline: string;
  campaignSubtitle: string;
  campaignDescription: string;
  heroImage: string;
  heroLabel: string;
  showCountdown: boolean;
  featuredOnHomepage: boolean;
  status: 'upcoming' | 'active' | 'previous';
  season: string;
}

export type StaffRole = 'owner' | 'management' | 'staff';

export interface StaffMember {
  id: string;
  name: string;
  position: string;
  role: StaffRole;
  bio: string;
  photo: string;
  showOnWebsite: boolean;
  displayOrder: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: StaffRole;
  position: string;
}

export interface SiteSettings {
  companyName: string;
  tagline: string;
  establishedYear: string;
  currencySymbol: string;
  footerText: string;
  socialLinks: {
    instagram: string;
    twitter: string;
    youtube: string;
  };
  discordUrl: string;
  seoTitle: string;
  seoDescription: string;
}

export type HomepageSectionType =
  | 'hero'
  | 'upcoming-drop'
  | 'shop'
  | 'featured-collection'
  | 'promotional-banner';

export interface HomepageSection {
  id: string;
  type: HomepageSectionType;
  title: string;
  enabled: boolean;
  displayOrder: number;
  config: {
    featuredCollectionId?: string;
    featuredDropId?: string;
    featuredProductIds?: string[];
    heroImage?: string;
    bannerText?: string;
    bannerImage?: string;
  };
}

export interface HomepageContent {
  sections: HomepageSection[];
}
