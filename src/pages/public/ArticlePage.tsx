import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Article } from '@/types';
import { articleService } from '@/services/articleService';
import { formatDate } from '@/utils/format';
import RichTextContent from '@/components/editor/RichTextContent';

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    articleService
      .getBySlug(slug)
      .then((row) => {
        if (row && row.status === 'published') setArticle(row);
        else setArticle(null);
        setLoading(false);
      })
      .catch(() => {
        setArticle(null);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink pt-24 flex items-center justify-center">
        <p className="text-sm tracking-wider uppercase text-bone-muted">Loading...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-ink pt-24 flex flex-col items-center justify-center gap-4">
        <p className="text-sm tracking-wider uppercase text-bone-muted">Article not found</p>
        <Link to="/magazine" className="text-sm text-lime hover:underline">
          Back to Magazine
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink">
      <section className="relative h-[70vh] min-h-[420px] max-h-[720px] overflow-hidden bg-ink">
        {article.coverImage ? (
          <img
            src={article.coverImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/30" />
        <div className="relative z-10 flex h-full flex-col justify-end">
          <div className="mx-auto w-full max-w-[900px] px-4 pb-12 pt-28 sm:px-6 lg:px-10">
            <Link
              to="/magazine"
              className="inline-flex items-center gap-2 text-xs tracking-widest2 uppercase text-bone-muted hover:text-lime transition-colors mb-6"
            >
              <ArrowLeft size={14} />
              Magazine
            </Link>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-8 bg-lime" />
              <span className="text-xs tracking-widest2 uppercase text-lime font-mono">Magazine</span>
            </div>
            <h1 className="font-display text-[10vw] sm:text-5xl lg:text-6xl leading-[0.9] tracking-tighter text-bone">
              {article.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs tracking-widest2 uppercase text-bone-muted font-mono">
              {article.publishedAt ? <span>{formatDate(article.publishedAt)}</span> : null}
              {article.authorName ? (
                <>
                  <span className="text-white/20">/</span>
                  <span>{article.authorName}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {article.excerpt ? (
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-10 border-b border-white/5">
          <p className="text-lg text-bone/80 leading-relaxed">{article.excerpt}</p>
        </div>
      ) : null}

      <article className="max-w-[720px] mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <RichTextContent body={article.body} />
      </article>
    </div>
  );
}
