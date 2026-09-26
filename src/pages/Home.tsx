/**
 * src/pages/Home.tsx — 主页：hero + Sysin 式文章列表
 */
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { listPosts } from "@/lib/blog-data";
import { useSiteSettings } from "@/components/SiteLayout";

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function postUrl(slug: string): string {
  return `/post/${slug.split("/").map(encodeURIComponent).join("/")}`;
}

export default function Home() {
  const { blogTitle, tagline } = useSiteSettings();
  const posts = listPosts();
  const [keyword, setKeyword] = useState("");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (posts ?? []).forEach((p) => p.tags.forEach((t: string) => set.add(t)));
    return [...set];
  }, [posts]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return posts ?? [];
    return (posts ?? []).filter(
      (p) =>
        p.title.toLowerCase().includes(kw) ||
        p.excerpt.toLowerCase().includes(kw) ||
        p.tags.some((t: string) => t.toLowerCase().includes(kw.replace(/^#/, ""))),
    );
  }, [posts, keyword]);

  const latest = posts[0];
  const lastUpdated = posts
    .map((p) => p.publishedAt ?? "")
    .sort()
    .pop();

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-content">
          <span className="badge-gradient">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.5 20 7v10l-8 4.5L4 17V7l8-4.5Z" />
            </svg>
            由 Obsidian 库直接发布 · 全站公开
          </span>
          <h1 className="grad-text">{blogTitle}</h1>
          <p className="tagline">{tagline}</p>
          <div className="hero-stats">
            <span className="stat-chip">
              <b>{posts.length}</b> 篇文章
            </span>
            <span className="stat-chip">
              <b>{allTags.length}</b> 个标签
            </span>
            {lastUpdated ? (
              <span className="stat-chip">
                最近更新 <b>{formatDate(new Date(lastUpdated))}</b>
              </span>
            ) : null}
          </div>
          <div className="hero-actions">
            {latest && (
              <Link className="btn-pv btn-pv-primary" to={postUrl(latest.slug)}>
                开始阅读 →
              </Link>
            )}
            <Link className="btn-pv btn-pv-secondary" to="/tags">
              浏览标签
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
          <div>
            <h2 className="section-label grad-text">最新文章</h2>
            <hr className="section-rule" />
          </div>
          {posts.length > 0 && (
            <input
              className="search-pv"
              placeholder="搜索标题 / 摘要 / 标签…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          )}
        </div>

        {posts.length === 0 && (
          <div className="empty-block">
            <div className="empty-title">还没有发布任何文章</div>
            <p>
              把 Obsidian 的 .md 文件放进仓库的 content/ 文件夹，网站会自动更新。
            </p>
          </div>
        )}

        <ul className="post-list">
          {filtered.map((p) => (
            <li key={p.slug}>
              <Link className="post-row" to={postUrl(p.slug)}>
                <div className="post-row-top">
                  <span className="post-date">{formatDate(p.publishedAt)}</span>
                  <span className="post-title">{p.title}</span>
                  <span className="post-path-hint hidden md:inline">{p.wordCount} 字</span>
                </div>
                {p.excerpt && <div className="post-excerpt">{p.excerpt}</div>}
                {p.tags.length > 0 && (
                  <div className="post-tags">
                    {p.tags.slice(0, 5).map((t: string) => (
                      <span key={t} className="md-tag">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
