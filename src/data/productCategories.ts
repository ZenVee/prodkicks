import type { ProductCategoryDef, ProductCategoryIconOption } from '@/types';

export const DEFAULT_PRODUCT_CATEGORIES: ProductCategoryDef[] = [
  { id: 'cat_footwear', slug: 'footwear', label: 'Footwear', icon: 'footprints' },
  { id: 'cat_tops', slug: 'tops', label: 'Tops', icon: 'shirt' },
  { id: 'cat_bottoms', slug: 'bottoms', label: 'Bottoms', icon: 'pants' },
  { id: 'cat_accessories', slug: 'accessories', label: 'Accessories', icon: 'watch' },
];

/** Curated apparel / streetwear icon set for category pickers */
export const PRODUCT_CATEGORY_ICONS: ProductCategoryIconOption[] = [
  // Apparel
  { value: 'shirt', label: 'Shirt', group: 'apparel', keywords: ['top', 'tee', 'tshirt', 'tops'] },
  { value: 'undershirt', label: 'Undershirt', group: 'apparel', keywords: ['base', 'layers', 'inner', 'tank'] },
  { value: 'hoodie', label: 'Hoodie', group: 'apparel', keywords: ['sweatshirt', 'outerwear', 'jacket'] },
  { value: 'pants', label: 'Pants', group: 'apparel', keywords: ['bottoms', 'trousers', 'jeans'] },
  { value: 'shorts', label: 'Shorts', group: 'apparel', keywords: ['bottoms', 'summer'] },
  { value: 'dress', label: 'Dress', group: 'apparel', keywords: ['gown', 'onepiece'] },
  { value: 'hat', label: 'Hat', group: 'apparel', keywords: ['cap', 'beanie', 'headwear'] },
  { value: 'scarf', label: 'Scarf', group: 'apparel', keywords: ['neck', 'wrap', 'winter'] },

  // Footwear
  { value: 'footprints', label: 'Footwear', group: 'footwear', keywords: ['shoes', 'sneakers', 'kicks', 'boots'] },
  { value: 'socks', label: 'Socks', group: 'footwear', keywords: ['hosiery', 'ankle'] },

  // Accessories
  { value: 'watch', label: 'Watch', group: 'accessories', keywords: ['timepiece', 'wrist'] },
  { value: 'glasses', label: 'Glasses', group: 'accessories', keywords: ['eyewear', 'sunglasses', 'shades'] },
  { value: 'mask', label: 'Mask', group: 'accessories', keywords: ['face', 'balaclava', 'cover', 'ski'] },
  { value: 'gem', label: 'Gem', group: 'accessories', keywords: ['jewelry', 'jewel', 'ring'] },
  { value: 'bag', label: 'Bag', group: 'accessories', keywords: ['tote', 'purse', 'handbag'] },
  { value: 'backpack', label: 'Backpack', group: 'accessories', keywords: ['pack', 'bag', 'daypack'] },
  { value: 'wallet', label: 'Wallet', group: 'accessories', keywords: ['cardholder', 'money'] },
  { value: 'umbrella', label: 'Umbrella', group: 'accessories', keywords: ['rain', 'parasol'] },
  { value: 'crown', label: 'Crown', group: 'accessories', keywords: ['royal', 'hat', 'headwear'] },
  { value: 'ribbon', label: 'Ribbon', group: 'accessories', keywords: ['bow', 'band', 'tie'] },
  { value: 'key', label: 'Keychain', group: 'accessories', keywords: ['keyring', 'charm'] },

  // General / lifestyle
  { value: 'tag', label: 'Tag', group: 'general', keywords: ['label', 'default', 'misc'] },
  { value: 'sparkles', label: 'New', group: 'general', keywords: ['featured', 'special', 'limited'] },
  { value: 'package', label: 'Package', group: 'general', keywords: ['box', 'shipping', 'bundle'] },
  { value: 'gift', label: 'Gift', group: 'general', keywords: ['present', 'promo'] },
  { value: 'heart', label: 'Heart', group: 'general', keywords: ['favorite', 'love'] },
  { value: 'star', label: 'Star', group: 'general', keywords: ['featured', 'rating'] },
  { value: 'zap', label: 'Zap', group: 'general', keywords: ['energy', 'drop', 'hot'] },
  { value: 'flame', label: 'Flame', group: 'general', keywords: ['hot', 'fire', 'trending'] },
  { value: 'dumbbell', label: 'Active', group: 'general', keywords: ['sport', 'gym', 'athletic'] },
  { value: 'palette', label: 'Palette', group: 'general', keywords: ['color', 'art', 'design'] },
  { value: 'camera', label: 'Camera', group: 'general', keywords: ['photo', 'media'] },
  { value: 'music', label: 'Music', group: 'general', keywords: ['audio', 'culture'] },
  { value: 'gamepad', label: 'Gaming', group: 'general', keywords: ['game', 'controller'] },
  { value: 'baby', label: 'Kids', group: 'general', keywords: ['children', 'youth', 'infant'] },
  { value: 'users', label: 'Unisex', group: 'general', keywords: ['people', 'all'] },
  { value: 'briefcase', label: 'Work', group: 'general', keywords: ['office', 'formal'] },
  { value: 'leaf', label: 'Eco', group: 'general', keywords: ['sustainable', 'nature'] },
  { value: 'snowflake', label: 'Winter', group: 'general', keywords: ['cold', 'season'] },
  { value: 'sun', label: 'Summer', group: 'general', keywords: ['warm', 'season'] },
];

const ICON_VALUES = new Set(PRODUCT_CATEGORY_ICONS.map((i) => i.value));

export function isProductCategoryIcon(value: string): boolean {
  return ICON_VALUES.has(value);
}

export function normalizeProductCategoryIcon(value: unknown): string {
  const key = String(value ?? 'tag');
  return ICON_VALUES.has(key) ? key : 'tag';
}
