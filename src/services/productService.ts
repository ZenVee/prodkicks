import type { Product, ProductCategory, ProductStatus, ProductAvailability } from '@/types';
import { mockProducts } from '@/data/products';

let products = [...mockProducts];

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 100));
}

export const productService = {
  async getAll(): Promise<Product[]> {
    return delay([...products]);
  },

  async getById(id: string): Promise<Product | null> {
    return delay(products.find((p) => p.id === id) ?? null);
  },

  async getBySlug(slug: string): Promise<Product | null> {
    return delay(products.find((p) => p.slug === slug) ?? null);
  },

  async getByCollection(collectionId: string): Promise<Product[]> {
    return delay(products.filter((p) => p.collectionId === collectionId));
  },

  async getRelated(product: Product, limit = 4): Promise<Product[]> {
    return delay(
      products
        .filter((p) => p.id !== product.id && p.category === product.category)
        .slice(0, limit)
    );
  },

  async getPublished(): Promise<Product[]> {
    return delay(products.filter((p) => p.status === 'published'));
  },

  async filter(opts: {
    category?: ProductCategory | 'all';
    search?: string;
    sort?: 'newest' | 'name-az' | 'price-low' | 'price-high';
    labels?: string[];
  }): Promise<Product[]> {
    let result = [...products];

    if (opts.category && opts.category !== 'all') {
      result = result.filter((p) => p.category === opts.category);
    }

    if (opts.search) {
      const q = opts.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.color.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }

    if (opts.labels && opts.labels.length > 0) {
      result = result.filter((p) =>
        opts.labels!.some((l) => p.labels.includes(l as any))
      );
    }

    switch (opts.sort) {
      case 'name-az':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return delay(result);
  },

  async create(data: Partial<Product>): Promise<Product> {
    const newProduct: Product = {
      id: `p${Date.now()}`,
      name: data.name ?? 'Untitled Product',
      slug: data.slug ?? data.name?.toLowerCase().replace(/\s+/g, '-') ?? 'untitled',
      sku: data.sku ?? 'PK-XX-000',
      category: data.category ?? 'footwear',
      price: data.price ?? 0,
      currency: data.currency ?? '$',
      color: data.color ?? 'Default',
      description: data.description ?? '',
      status: data.status ?? 'draft',
      availability: data.availability ?? 'available',
      labels: data.labels ?? [],
      collectionId: data.collectionId ?? null,
      variants: data.variants ?? [],
      images: data.images ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products = [newProduct, ...products];
    return delay(newProduct);
  },

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return delay(null);
    products[idx] = { ...products[idx], ...data, updatedAt: new Date().toISOString() };
    return delay(products[idx]);
  },

  async delete(id: string): Promise<boolean> {
    const before = products.length;
    products = products.filter((p) => p.id !== id);
    return delay(products.length < before);
  },

  async duplicate(id: string): Promise<Product | null> {
    const original = products.find((p) => p.id === id);
    if (!original) return delay(null);
    const copy: Product = {
      ...original,
      id: `p${Date.now()}`,
      name: `${original.name} (Copy)`,
      slug: `${original.slug}-copy`,
      sku: `${original.sku}-C`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products = [copy, ...products];
    return delay(copy);
  },

  async countByStatus(status: ProductStatus): Promise<number> {
    return delay(products.filter((p) => p.status === status).length);
  },

  async getRecent(limit = 4): Promise<Product[]> {
    return delay(
      [...products]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, limit)
    );
  },
};
