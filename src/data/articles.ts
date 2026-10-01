import type { Article, ArticleBody } from '@/types';

const sampleBody = (paragraphs: string[]): ArticleBody => ({
  type: 'doc',
  content: paragraphs.flatMap((text, i) => [
    ...(i === 0
      ? [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'The Cut' }],
          } as Record<string, unknown>,
        ]
      : []),
    {
      type: 'paragraph',
      content: [{ type: 'text', text }],
    },
  ]),
});

export const mockArticles: Article[] = [
  {
    id: 'a1',
    title: 'After Hours: Dressing for the Quiet City',
    slug: 'after-hours-dressing-for-the-quiet-city',
    excerpt:
      'How tonal blacks, acid accents, and campaign-grade silhouette define the hours when the streets belong to you.',
    coverImage:
      'https://images.pexels.com/photos/13873170/pexels-photo-13873170.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    body: sampleBody([
      'Night softens the noise. Silhouettes sharpen. After Hours is built for movement through empty avenues — heavyweight layers, tonal depth, and a lime flash that reads like a signal.',
      'The Drop 026 campaign leans into shadow and form. Every piece is cut for the hours when the city goes quiet and the street becomes a runway without an audience.',
      'Wear it low-key or loud. The rule is the same: the night is the canvas.',
    ]),
    status: 'published',
    featuredOnHomepage: true,
    authorId: null,
    authorName: 'Marcus Cole',
    publishedAt: '2026-09-16T10:00:00Z',
    createdAt: '2026-09-14T10:00:00Z',
    updatedAt: '2026-09-16T10:00:00Z',
  },
  {
    id: 'a2',
    title: 'No Signal: Fashion Between Transmissions',
    slug: 'no-signal-fashion-between-transmissions',
    excerpt:
      'Technical fabrics, disrupted graphics, and a cold palette — the editorial behind Drop 027.',
    coverImage:
      'https://images.pexels.com/photos/18462142/pexels-photo-18462142.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    body: sampleBody([
      'No Signal lives in the gap between transmission and silence. The collection treats interference as aesthetic — broken grids, technical nylon, and a palette that stays cold on purpose.',
      'This chapter asks what style looks like when the feed drops out. Spoiler: it looks sharper.',
    ]),
    status: 'published',
    featuredOnHomepage: true,
    authorId: null,
    authorName: 'Elena Vasquez',
    publishedAt: '2026-09-20T12:00:00Z',
    createdAt: '2026-09-18T10:00:00Z',
    updatedAt: '2026-09-20T12:00:00Z',
  },
  {
    id: 'a3',
    title: 'Essentials Manifesto (Draft)',
    slug: 'essentials-manifesto',
    excerpt: 'Fit, fabric, function — a draft look at the wardrobe foundation.',
    coverImage:
      'https://images.pexels.com/photos/28701960/pexels-photo-28701960.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    body: sampleBody([
      'Draft notes on Essentials: heavyweight cottons, utility silhouettes, muted palette. Publish when merch calendar locks.',
    ]),
    status: 'draft',
    featuredOnHomepage: false,
    authorId: null,
    authorName: 'Sofia Reyes',
    publishedAt: null,
    createdAt: '2026-09-25T10:00:00Z',
    updatedAt: '2026-09-25T10:00:00Z',
  },
];
