import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Article } from '@/types';
import { articleService } from '@/services/articleService';
import { formatDate } from '@/utils/format';

export default function MagazinePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    articleService
      .getPublished()
      .then((rows) => {
        setArticles(rows);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-ink pt-16 lg:pt-20">
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <p className="font-display text-[28vw] leading-none text-white/[0.015] whitespace-nowrap tracking-tighter select-none">
            MAGAZINE
          </p>
        </div>
        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-6 animate-fade-up">
            <span className="w-8 h-px bg-lime" />
            <span className="text-xs tracking-widest2 uppercase text-bone-muted">Editorial</span>
          </div>
          <h1 className="font-display text-[14vw] sm:text-[10vw] lg:text-[7vw] leading-[0.85] tracking-tighter text-bone animate-fade-up animate-delay-100">
            MAGAZINE
          </h1>
          <p className="mt-6 max-w-lg text-sm lg:text-base text-bone-muted leading-relaxed animate-fade-up animate-delay-200">
            Fashion stories, drop notes, and culture from the Prod Kicks desk.
          </p>
        </div>
      </section>

      <section className="pb-24 border-t border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-12">
          {loading ? (
            <p className="text-sm tracking-wider uppercase text-bone-muted text-center py-16">Loading...</p>
          ) : articles.length === 0 ? (
            <p className="text-sm tracking-wider uppercase text-bone-muted text-center py-16">
              No articles yet
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {articles.map((article, i) => (
                <Link
                  key={article.id}
                  to={`/magazine/${article.slug}`}
                  className="group block animate-fade-up"
                  style={{ animationDelay: `${Math.min(i, 5) * 0.08}s` }}
                >
                  <div className="aspect-[4/5] overflow-hidden bg-ink-raised">
                    {article.coverImage ? (
                      <img
                        src={article.coverImage}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-[10px] tracking-widest2 uppercase text-bone-muted font-mono">
                      {article.publishedAt ? <span>{formatDate(article.publishedAt)}</span> : null}
                      {article.authorName ? (
                        <>
                          <span className="text-white/20">/</span>
                          <span>{article.authorName}</span>
                        </>
                      ) : null}
                    </div>
                    <h2 className="mt-2 font-display text-2xl tracking-tight text-bone group-hover:text-lime transition-colors leading-tight">
                      {article.title}
                    </h2>
                    {article.excerpt ? (
                      <p className="mt-2 text-sm text-bone-muted line-clamp-3 leading-relaxed">
                        {article.excerpt}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
