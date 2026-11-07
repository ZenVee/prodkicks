/** Stored on products as a slug from SiteSettings.productCategories */
export type ProductCategory = string;

/** Key into the curated product-category icon catalog */
export type ProductCategoryIcon = string;

export type ProductCategoryIconGroup = 'apparel' | 'footwear' | 'accessories' | 'general';

export interface ProductCategoryIconOption {
  value: ProductCategoryIcon;
  label: string;
  group: ProductCategoryIconGroup;
  keywords: string[];
}

export interface ProductCategoryDef {
  id: string;
  slug: string;
  label: string;
  icon: ProductCategoryIcon;
}

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
  /** When true, product is hidden from the storefront and used only for portal sales tracking. */
  salesOnly: boolean;
  /** When true, sales require a gang/business name and Sales only is implied. */
  gangBizItem: boolean;
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

/** Portal RBAC role row (separate from public team StaffRole). */
export interface StaffRoleRecord {
  id: string;
  key: string;
  label: string;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

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
  | 'audit.view'
  | 'sales.create'
  | 'sales.edit'
  | 'sales.view'
  | 'sales.delete'
  | 'payroll.view'
  | 'payroll.process'
  | 'payroll.reverse';

export interface SalesAssignee {
  id: string;
  fullName: string | null;
  discordUsername: string | null;
}

export interface CommissionSale {
  id: string;
  productId: string | null;
  productName: string;
  productSku: string;
  gangBusinessName: string;
  salePrice: number;
  commissionPercentage: number;
  commissionAmount: number;
  soldBy: string;
  soldByName: string | null;
  soldAt: string;
  payrollRunId: string | null;
  paidAt: string | null;
}

export interface PayrollBonusInput {
  staffAccountId: string;
  amount: number;
  note?: string;
}

export interface UnpaidPayrollEmployee {
  staffAccountId: string;
  staffName: string | null;
  sales: CommissionSale[];
  commissionTotal: number;
}

export interface PayrollLogSale {
  id: string;
  productName: string;
  productSku: string;
  gangBusinessName: string;
  salePrice: number;
  commissionPercentage: number;
  commissionAmount: number;
  soldAt: string;
}

export interface PayrollLogEmployee {
  staffAccountId: string;
  staffName: string;
  commissionTotal: number;
  bonusAmount: number;
  bonusNote: string;
  payout: number;
  sales: PayrollLogSale[];
}

export interface PayrollLogSnapshot {
  salesCount: number;
  commissionTotal: number;
  bonusTotal: number;
  grandTotal: number;
  employees: PayrollLogEmployee[];
}

export interface PayrollLog {
  id: string;
  processedBy: string;
  processedByName: string | null;
  processedAt: string;
  reversedAt: string | null;
  reversedBy: string | null;
  reversedByName: string | null;
  snapshot: PayrollLogSnapshot;
}

export interface StaffAccount {
  id: string;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatarUrl: string | null;
  fullName: string | null;
  stateId: string | null;
  status: AccountStatus | null;
  roleId: string | null;
  roleKey: string | null;
  roleLabel: string | null;
  profileCompletedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  roleId: string;
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
  actorName: string | null;
  targetUserId: string | null;
  targetName: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PermissionDefinition {
  key: Permission;
  category: string;
  label: string;
  description: string;
  sortOrder: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  roleKey: string | null;
  roleLabel: string | null;
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
  commissionPercentage: number;
  productCategories: ProductCategoryDef[];
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
