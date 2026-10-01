import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Article, ArticleStatus } from '@/types';
import { articleService } from '@/services/articleService';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { slugify } from '@/utils/format';
import { mapSupabaseError } from '@/utils/errors';
import RichTextEditor, { EMPTY_DOC } from '@/components/editor/RichTextEditor';
import SlugField from '@/components/common/SlugField';

export default function PortalMagazineEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, account } = useAuth();
  const isNew = !id || id === 'new';

  const [article, setArticle] = useState<Partial<Article>>({
    title: '',
    slug: '',
    excerpt: '',
    coverImage: '',
    body: EMPTY_DOC,
    status: 'draft',
    featuredOnHomepage: false,
    authorId: null,
    authorName: '',
  });
  const [slugLocked, setSlugLocked] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) {
      setArticle((prev) => ({
        ...prev,
        authorId: account?.id ?? user?.id ?? null,
        authorName: account?.fullName || user?.name || '',
      }));
      return;
    }
    if (!id) return;
    articleService
      .getById(id)
      .then((row) => {
        if (row) setArticle(row);
        setLoading(false);
      })
      .catch((err) => {
        showToast(mapSupabaseError(err).message, 'error');
        setLoading(false);
      });
  }, [id, isNew, account, user, showToast]);

  const update = <K extends keyof Article>(field: K, value: Article[K]) => {
    setArticle((prev) => ({ ...prev, [field]: value }));
  };

  const handleTitleChange = (title: string) => {
    setArticle((prev) => ({
      ...prev,
      title,
      ...(slugLocked ? { slug: slugify(title) } : {}),
    }));
  };

  const handleSave = async (publish = false) => {
    if (!article.title?.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    const slug = (article.slug || slugify(article.title)).trim();
    if (!slug) {
      showToast('Slug is required', 'error');
      return;
    }

    const data: Partial<Article> = {
      ...article,
      slug,
      status: publish ? 'published' : 'draft',
      authorId: article.authorId ?? account?.id ?? user?.id ?? null,
      authorName: article.authorName || account?.fullName || user?.name || '',
    };

    setSaving(true);
    try {
      if (isNew) {
        await articleService.create(data);
        showToast(publish ? 'Article published' : 'Draft saved', 'success');
      } else if (id) {
        await articleService.update(id, data);
        showToast(publish ? 'Article published' : 'Changes saved', 'success');
      }
      navigate('/portal/magazine');
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-bone-muted py-12 text-center">Loading...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/portal/magazine" className="text-bone-muted hover:text-bone transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl tracking-tighter text-bone">
            {isNew ? 'New Article' : 'Edit Article'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="px-4 py-2 text-sm border border-white/15 text-bone hover:border-lime/50 hover:text-lime transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(true)}
            className="px-4 py-2.5 bg-lime text-ink text-sm font-medium tracking-wider uppercase hover:bg-lime-dark transition-colors disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Title</label>
          <input
            type="text"
            value={article.title ?? ''}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="portal-input text-lg"
            placeholder="Article headline"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SlugField
            value={article.slug ?? ''}
            onChange={(slug) => update('slug', slug)}
            onLockChange={setSlugLocked}
          />
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Author</label>
            <input
              type="text"
              value={article.authorName ?? ''}
              onChange={(e) => update('authorName', e.target.value)}
              className="portal-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Excerpt</label>
          <textarea
            value={article.excerpt ?? ''}
            onChange={(e) => update('excerpt', e.target.value)}
            rows={2}
            className="portal-input resize-y"
            placeholder="Short summary for listings and hero"
          />
        </div>

        <div>
          <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">
            Cover Image URL
          </label>
          <input
            type="text"
            value={article.coverImage ?? ''}
            onChange={(e) => update('coverImage', e.target.value)}
            className="portal-input"
            placeholder="https://"
          />
          {article.coverImage ? (
            <div className="mt-3 aspect-[21/9] overflow-hidden bg-ink-raised border border-white/5">
              <img src={article.coverImage} alt="" className="w-full h-full object-cover" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={article.featuredOnHomepage ?? false}
              onChange={(e) => update('featuredOnHomepage', e.target.checked)}
              className="accent-lime w-4 h-4"
            />
            <span className="text-xs tracking-wider uppercase text-bone-muted">Featured on homepage</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-xs tracking-wider uppercase text-bone-muted">Status</label>
            <select
              value={article.status ?? 'draft'}
              onChange={(e) => update('status', e.target.value as ArticleStatus)}
              className="portal-input w-auto"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">Body</label>
          <RichTextEditor
            key={isNew ? 'new' : id}
            value={article.body}
            onChange={(body) => update('body', body)}
            placeholder="Write the article…"
          />
        </div>
      </div>
    </div>
  );
}
