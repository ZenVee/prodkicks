import type { Article, ArticleBody, ArticleStatus } from '@/types';
import type { Database, Json } from '@/types/database';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapSupabaseError } from '@/utils/errors';
import { mockArticles } from '@/data/articles';

type ArticleRow = Database['public']['Tables']['articles']['Row'];

const EMPTY_BODY: ArticleBody = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

let localArticles = [...mockArticles];

function parseBody(value: Json): ArticleBody {
  if (value && typeof value === 'object' && !Array.isArray(value) && (value as ArticleBody).type === 'doc') {
    return value as ArticleBody;
  }
  return EMPTY_BODY;
}

function fromRow(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    coverImage: row.cover_image,
    body: parseBody(row.body),
    status: row.status as ArticleStatus,
    featuredOnHomepage: row.featured_on_homepage,
    authorId: row.author_id,
    authorName: row.author_name,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsert(data: Partial<Article>, id: string): Database['public']['Tables']['articles']['Insert'] {
  return {
    id,
    title: data.title ?? 'Untitled Article',
    slug: data.slug ?? 'untitled',
    excerpt: data.excerpt ?? '',
    cover_image: data.coverImage ?? '',
    body: (data.body ?? EMPTY_BODY) as unknown as Json,
    status: data.status ?? 'draft',
    featured_on_homepage: data.featuredOnHomepage ?? false,
    author_id: data.authorId ?? null,
    author_name: data.authorName ?? '',
    published_at:
      data.status === 'published'
        ? data.publishedAt ?? new Date().toISOString()
        : null,
  };
}

function toUpdate(data: Partial<Article>): Database['public']['Tables']['articles']['Update'] {
  const update: Database['public']['Tables']['articles']['Update'] = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.slug !== undefined) update.slug = data.slug;
  if (data.excerpt !== undefined) update.excerpt = data.excerpt;
  if (data.coverImage !== undefined) update.cover_image = data.coverImage;
  if (data.body !== undefined) update.body = data.body as unknown as Json;
  if (data.status !== undefined) {
    update.status = data.status;
    if (data.status === 'published' && data.publishedAt !== undefined) {
      update.published_at = data.publishedAt;
    } else if (data.status === 'draft') {
      update.published_at = null;
    } else if (data.status === 'published') {
      update.published_at = data.publishedAt ?? new Date().toISOString();
    }
  }
  if (data.featuredOnHomepage !== undefined) update.featured_on_homepage = data.featuredOnHomepage;
  if (data.authorId !== undefined) update.author_id = data.authorId;
  if (data.authorName !== undefined) update.author_name = data.authorName;
  if (data.publishedAt !== undefined && data.status === undefined) {
    update.published_at = data.publishedAt;
  }
  return update;
}

export const articleService = {
  async getAll(): Promise<Article[]> {
    if (!isSupabaseConfigured) return [...localArticles];
    const { data, error } = await getSupabase()
      .from('articles')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map(fromRow);
  },

  async getPublished(): Promise<Article[]> {
    if (!isSupabaseConfigured) {
      return localArticles
        .filter((a) => a.status === 'published')
        .sort(
          (a, b) =>
            new Date(b.publishedAt ?? b.createdAt).getTime() -
            new Date(a.publishedAt ?? a.createdAt).getTime()
        );
    }
    const { data, error } = await getSupabase()
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map(fromRow);
  },

  async getFeatured(): Promise<Article[]> {
    const published = await this.getPublished();
    return published.filter((a) => a.featuredOnHomepage);
  },

  async getById(id: string): Promise<Article | null> {
    if (!isSupabaseConfigured) return localArticles.find((a) => a.id === id) ?? null;
    const { data, error } = await getSupabase().from('articles').select('*').eq('id', id).maybeSingle();
    if (error) throw mapSupabaseError(error);
    return data ? fromRow(data) : null;
  },

  async getBySlug(slug: string): Promise<Article | null> {
    if (!isSupabaseConfigured) return localArticles.find((a) => a.slug === slug) ?? null;
    const { data, error } = await getSupabase().from('articles').select('*').eq('slug', slug).maybeSingle();
    if (error) throw mapSupabaseError(error);
    return data ? fromRow(data) : null;
  },

  async create(data: Partial<Article>): Promise<Article> {
    const id = `a${Date.now()}`;
    if (!isSupabaseConfigured) {
      const status = data.status ?? 'draft';
      const article: Article = {
        id,
        title: data.title ?? 'Untitled Article',
        slug: data.slug ?? 'untitled',
        excerpt: data.excerpt ?? '',
        coverImage: data.coverImage ?? '',
        body: data.body ?? EMPTY_BODY,
        status,
        featuredOnHomepage: data.featuredOnHomepage ?? false,
        authorId: data.authorId ?? null,
        authorName: data.authorName ?? '',
        publishedAt: status === 'published' ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localArticles = [article, ...localArticles];
      return article;
    }
    const { data: row, error } = await getSupabase().from('articles').insert(toInsert(data, id)).select('*').single();
    if (error) throw mapSupabaseError(error);
    return fromRow(row);
  },

  async update(id: string, data: Partial<Article>): Promise<Article | null> {
    if (!isSupabaseConfigured) {
      const idx = localArticles.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      const prev = localArticles[idx];
      const nextStatus = data.status ?? prev.status;
      localArticles[idx] = {
        ...prev,
        ...data,
        publishedAt:
          nextStatus === 'published'
            ? data.publishedAt ?? prev.publishedAt ?? new Date().toISOString()
            : nextStatus === 'draft'
              ? null
              : prev.publishedAt,
        updatedAt: new Date().toISOString(),
      };
      return localArticles[idx];
    }
    const { data: row, error } = await getSupabase()
      .from('articles')
      .update(toUpdate(data))
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw mapSupabaseError(error);
    return row ? fromRow(row) : null;
  },

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const before = localArticles.length;
      localArticles = localArticles.filter((a) => a.id !== id);
      return localArticles.length < before;
    }
    const { error } = await getSupabase().from('articles').delete().eq('id', id);
    if (error) throw mapSupabaseError(error);
    return true;
  },
};
