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

/** Employee portal RBAC roles (separate from public team StaffRole). */
export type EmployeeRole = 'developer' | 'owner' | 'manager' | 'staff';

export type AccountStatus = 'pending' | 'approved' | 'declined' | 'disabled';

export type Permission =
  | 'products.view'
  | 'products.create'
  | 'products.edit'
  | 'products.delete'
  | 'products.publish'
  | 'collections.view'
  | 'collections.create'
  | 'collections.edit'
  | 'collections.delete'
  | 'drops.view'
  | 'drops.create'
  | 'drops.edit'
  | 'drops.delete'
  | 'drops.publish'
  | 'magazine.view'
  | 'magazine.create'
  | 'magazine.edit'
  | 'magazine.delete'
  | 'magazine.publish'
  | 'team.view'
  | 'team.create'
  | 'team.edit'
  | 'team.delete'
  | 'homepage.edit'
  | 'settings.view'
  | 'settings.edit'
  | 'accounts.view'
  | 'accounts.approve'
  | 'accounts.decline'
  | 'accounts.disable'
  | 'permissions.view'
  | 'permissions.manage'
  | 'audit.view';

export interface StaffAccount {
  id: string;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatarUrl: string | null;
  fullName: string | null;
  stateId: string | null;
  status: AccountStatus | null;
  role: EmployeeRole | null;
  profileCompletedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  role: Exclude<EmployeeRole, 'developer'>;
  permissionKey: Permission;
}

export interface AccessRequest {
  id: string;
  discordUsername: string | null;
  discordAvatarUrl: string | null;
  fullName: string | null;
  stateId: string | null;
  profileCompletedAt: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  targetUserId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PermissionDefinition {
  key: Permission;
  category: string;
  label: string;
  sortOrder: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: EmployeeRole | null;
  position: string;
}

export interface SiteSettings {
  companyName: string;
  tagline: string;
  establishedYear: string;
  currencySymbol: string;
  footerText: string;
  seoTitle: string;
  seoDescription: string;
}

export type ArticleStatus = 'draft' | 'published';

/** TipTap document JSON */
export type ArticleBody = {
  type: 'doc';
  content?: Record<string, unknown>[];
};

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  body: ArticleBody;
  status: ArticleStatus;
  featuredOnHomepage: boolean;
  authorId: string | null;
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HeroMode = 'drops' | 'articles_first' | 'mixed' | 'featured_articles';

export type HomepageSectionType =
  | 'hero'
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
    featuredDropIds?: string[];
    featuredProductIds?: string[];
    heroImage?: string;
    heroMode?: HeroMode;
    bannerText?: string;
    bannerImage?: string;
  };
}

export interface HomepageContent {
  sections: HomepageSection[];
}
