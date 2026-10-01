import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import type { Article, ArticleStatus } from '@/types';
import { articleService } from '@/services/articleService';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/common/Modal';
import { formatRelativeTime } from '@/utils/format';
import { mapSupabaseError } from '@/utils/errors';

const statusColors: Record<ArticleStatus, string> = {
  published: 'text-lime',
  draft: 'text-bone-muted',
};

const statusFilters: { label: string; value: ArticleStatus | 'all' }[] = [
  { label: 'All Status', value: 'all' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
];

export default function PortalMagazine() {
  const { showToast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ArticleStatus | 'all'>('all');
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);

  const load = () => {
    setLoading(true);
    articleService
      .getAll()
      .then((rows) => {
        setArticles(rows);
        setLoading(false);
      })
      .catch((err) => {
        showToast(mapSupabaseError(err).message, 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = [...articles];
    if (status !== 'all') result = result.filter((a) => a.status === status);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q) ||
          a.authorName.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [articles, status, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await articleService.delete(deleteTarget.id);
      showToast(`${deleteTarget.title} deleted`, 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    }
  };

  const togglePublish = async (article: Article) => {
    const next: ArticleStatus = article.status === 'published' ? 'draft' : 'published';
    try {
      await articleService.update(article.id, { status: next });
      showToast(next === 'published' ? 'Article published' : 'Article unpublished', 'success');
      load();
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone">Magazine</h1>
          <p className="text-sm text-bone-muted mt-1">{filtered.length} articles</p>
        </div>
        <Link
          to="/portal/magazine/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-lime text-ink text-sm font-medium tracking-wider uppercase hover:bg-lime-dark transition-colors"
        >
          <Plus size={16} />
          New Article
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-muted" />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-ink-surface border border-white/10 text-bone placeholder:text-bone-muted focus:border-lime/50 focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ArticleStatus | 'all')}
          className="px-3 py-2 text-sm bg-ink-surface border border-white/10 text-bone focus:border-lime/50 focus:outline-none"
        >
          {statusFilters.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden lg:block bg-ink-surface border border-white/5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Cover</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Title</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Author</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Status</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Featured</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Updated</th>
              <th className="text-right text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center text-sm text-bone-muted py-12">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-sm text-bone-muted py-12">
                  No articles found
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-ink-raised/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="w-14 h-10 overflow-hidden bg-ink-raised">
                      {a.coverImage ? (
                        <img src={a.coverImage} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/portal/magazine/${a.id}/edit`}
                      className="text-sm text-bone hover:text-lime transition-colors"
                    >
                      {a.title || 'Untitled'}
                    </Link>
                    <p className="text-[10px] text-bone-muted font-mono mt-0.5">/{a.slug}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-bone-muted">{a.authorName || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs capitalize ${statusColors[a.status]}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-bone-muted">
                    {a.featuredOnHomepage ? 'Yes' : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-bone-muted">{formatRelativeTime(a.updatedAt)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        to={`/portal/magazine/${a.id}/edit`}
                        title="Edit"
                        className="p-1.5 text-bone-muted hover:text-lime transition-colors"
                      >
                        <Edit2 size={15} />
                      </Link>
                      <button
                        type="button"
                        title={a.status === 'published' ? 'Unpublish' : 'Publish'}
                        onClick={() => togglePublish(a)}
                        className="p-1.5 text-bone-muted hover:text-lime transition-colors"
                      >
                        {a.status === 'published' ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => setDeleteTarget(a)}
                        className="p-1.5 text-bone-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-3">
        {loading ? (
          <p className="text-sm text-bone-muted text-center py-12">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-bone-muted text-center py-12">No articles found</p>
        ) : (
          filtered.map((a) => (
            <div key={a.id} className="bg-ink-surface border border-white/5 p-4">
              <div className="flex items-start gap-3">
                <div className="w-20 h-14 overflow-hidden bg-ink-raised shrink-0">
                  {a.coverImage ? (
                    <img src={a.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/portal/magazine/${a.id}/edit`} className="text-sm text-bone hover:text-lime">
                    {a.title || 'Untitled'}
                  </Link>
                  <p className="text-xs text-bone-muted mt-0.5">{a.authorName || '—'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs capitalize ${statusColors[a.status]}`}>{a.status}</span>
                    <div className="inline-flex items-center gap-1">
                      <Link
                        to={`/portal/magazine/${a.id}/edit`}
                        className="p-1.5 text-bone-muted hover:text-lime"
                      >
                        <Edit2 size={15} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => togglePublish(a)}
                        className="p-1.5 text-bone-muted hover:text-lime"
                      >
                        {a.status === 'published' ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(a)}
                        className="p-1.5 text-bone-muted hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Article"
        onConfirm={handleDelete}
        confirmLabel="Delete"
      >
        <p className="text-sm text-bone-muted">
          Delete <span className="text-bone">{deleteTarget?.title}</span>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
