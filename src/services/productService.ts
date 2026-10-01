import type { Product, ProductCategory, ProductStatus } from '@/types';
import type { Database } from '@/types/database';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapSupabaseError } from '@/utils/errors';
import { mockProducts } from '@/data/products';
import { collectionService } from '@/services/collectionService';

type ProductRow = Database['public']['Tables']['products']['Row'];

let localProducts = [...mockProducts];

async function syncCollectionMembership(
  productId: string,
  previousCollectionId: string | null | undefined,
  nextCollectionId: string | null | undefined
) {
  if (previousCollectionId === nextCollectionId) return;

  if (previousCollectionId) {
    const prev = await collectionService.getById(previousCollectionId);
    if (prev) {
      await collectionService.update(previousCollectionId, {
        productIds: prev.productIds.filter((id) => id !== productId),
      });
    }
  }

  if (nextCollectionId) {
    const next = await collectionService.getById(nextCollectionId);
    if (next && !next.productIds.includes(productId)) {
      await collectionService.update(nextCollectionId, {
        productIds: [...next.productIds, productId],
      });
    }
  }
}

function fromRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    category: row.category as Product['category'],
    price: Number(row.price),
    currency: row.currency,
    color: row.color,
    description: row.description,
    status: row.status as Product['status'],
    availability: row.availability as Product['availability'],
    labels: (row.labels ?? []) as Product['labels'],
    collectionId: row.collection_id,
    variants: (row.variants as unknown as Product['variants']) ?? [],
    images: row.images ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsert(data: Partial<Product>, id: string): Database['public']['Tables']['products']['Insert'] {
  return {
    id,
    name: data.name ?? 'Untitled Product',
    slug: data.slug ?? 'untitled',
    sku: data.sku ?? 'PK-XX-000',
    category: data.category ?? 'footwear',
    price: data.price ?? 0,
    currency: data.currency ?? '$',
    color: data.color ?? 'Default',
    description: data.description ?? '',
    status: data.status ?? 'draft',
    availability: data.availability ?? 'available',
    labels: data.labels ?? [],
    collection_id: data.collectionId ?? null,
    variants: (data.variants ?? []) as unknown as Database['public']['Tables']['products']['Insert']['variants'],
    images: data.images ?? [],
  };
}

function toUpdate(data: Partial<Product>): Database['public']['Tables']['products']['Update'] {
  const update: Database['public']['Tables']['products']['Update'] = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.slug !== undefined) update.slug = data.slug;
  if (data.sku !== undefined) update.sku = data.sku;
  if (data.category !== undefined) update.category = data.category;
  if (data.price !== undefined) update.price = data.price;
  if (data.currency !== undefined) update.currency = data.currency;
  if (data.color !== undefined) update.color = data.color;
  if (data.description !== undefined) update.description = data.description;
  if (data.status !== undefined) update.status = data.status;
  if (data.availability !== undefined) update.availability = data.availability;
  if (data.labels !== undefined) update.labels = data.labels;
  if (data.collectionId !== undefined) update.collection_id = data.collectionId;
  if (data.variants !== undefined) {
    update.variants = data.variants as unknown as Database['public']['Tables']['products']['Update']['variants'];
  }
  if (data.images !== undefined) update.images = data.images;
  return update;
}

export const productService = {
  async getAll(): Promise<Product[]> {
    if (!isSupabaseConfigured) return [...localProducts];
    const { data, error } = await getSupabase().from('products').select('*').order('updated_at', { ascending: false });
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map(fromRow);
  },

  async getById(id: string): Promise<Product | null> {
    if (!isSupabaseConfigured) return localProducts.find((p) => p.id === id) ?? null;
    const { data, error } = await getSupabase().from('products').select('*').eq('id', id).maybeSingle();
    if (error) throw mapSupabaseError(error);
    return data ? fromRow(data) : null;
  },

  async getBySlug(slug: string): Promise<Product | null> {
    if (!isSupabaseConfigured) return localProducts.find((p) => p.slug === slug) ?? null;
    const { data, error } = await getSupabase().from('products').select('*').eq('slug', slug).maybeSingle();
    if (error) throw mapSupabaseError(error);
    return data ? fromRow(data) : null;
  },

  async getByCollection(collectionId: string): Promise<Product[]> {
    if (!isSupabaseConfigured) {
      return localProducts.filter((p) => p.collectionId === collectionId);
    }
    const { data, error } = await getSupabase()
      .from('products')
      .select('*')
      .eq('collection_id', collectionId)
      .order('updated_at', { ascending: false });
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map(fromRow);
  },

  async getRelated(product: Product, limit = 4): Promise<Product[]> {
    const all = await this.getPublished();
    return all.filter((p) => p.id !== product.id && p.category === product.category).slice(0, limit);
  },

  async getPublished(): Promise<Product[]> {
    if (!isSupabaseConfigured) return localProducts.filter((p) => p.status === 'published');
    const { data, error } = await getSupabase().from('products').select('*').eq('status', 'published');
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map(fromRow);
  },

  async filter(opts: {
    category?: ProductCategory | 'all';
    search?: string;
    sort?: 'newest' | 'name-az' | 'price-low' | 'price-high';
    labels?: string[];
    productIds?: string[];
  }): Promise<Product[]> {
    let result = await this.getPublished();

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
      result = result.filter((p) => opts.labels!.some((l) => p.labels.includes(l as Product['labels'][number])));
    }
    if (opts.productIds && opts.productIds.length > 0) {
      const order = new Map(opts.productIds.map((id, index) => [id, index]));
      const featured = result
        .filter((p) => order.has(p.id))
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      const rest = result.filter((p) => !order.has(p.id));
      // Keep featured order first, then remaining published products (so new items still appear).
      result = [...featured, ...rest];
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

    return result;
  },

  async create(data: Partial<Product>): Promise<Product> {
    const id = `p${Date.now()}`;
    if (!isSupabaseConfigured) {
      const newProduct: Product = {
        id,
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
      localProducts = [newProduct, ...localProducts];
      await syncCollectionMembership(id, null, newProduct.collectionId);
      return newProduct;
    }
    const { data: row, error } = await getSupabase().from('products').insert(toInsert(data, id)).select('*').single();
    if (error) throw mapSupabaseError(error);
    const created = fromRow(row);
    await syncCollectionMembership(created.id, null, created.collectionId);
    return created;
  },

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    const previous = await this.getById(id);
    if (!previous) return null;

    if (!isSupabaseConfigured) {
      const idx = localProducts.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      localProducts[idx] = { ...localProducts[idx], ...data, updatedAt: new Date().toISOString() };
      if (data.collectionId !== undefined) {
        await syncCollectionMembership(id, previous.collectionId, data.collectionId);
      }
      return localProducts[idx];
    }
    const { data: row, error } = await getSupabase().from('products').update(toUpdate(data)).eq('id', id).select('*').maybeSingle();
    if (error) throw mapSupabaseError(error);
    if (!row) return null;
    const updated = fromRow(row);
    if (data.collectionId !== undefined) {
      await syncCollectionMembership(id, previous.collectionId, updated.collectionId);
    }
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!isSupabaseConfigured) {
      const before = localProducts.length;
      localProducts = localProducts.filter((p) => p.id !== id);
      if (existing?.collectionId) {
        await syncCollectionMembership(id, existing.collectionId, null);
      }
      return localProducts.length < before;
    }
    const { error } = await getSupabase().from('products').delete().eq('id', id);
    if (error) throw mapSupabaseError(error);
    if (existing?.collectionId) {
      await syncCollectionMembership(id, existing.collectionId, null);
    }
    return true;
  },

  async duplicate(id: string): Promise<Product | null> {
    const original = await this.getById(id);
    if (!original) return null;
    return this.create({
      ...original,
      name: `${original.name} (Copy)`,
      slug: `${original.slug}-copy`,
      sku: `${original.sku}-C`,
      status: 'draft',
    });
  },

  async countByStatus(status: ProductStatus): Promise<number> {
    const all = await this.getAll();
    return all.filter((p) => p.status === status).length;
  },

  async getRecent(limit = 4): Promise<Product[]> {
    const all = await this.getAll();
    return [...all]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  },
};
