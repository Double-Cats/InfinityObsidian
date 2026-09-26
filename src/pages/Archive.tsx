/**
 * src/pages/Archive.tsx — 归档：按年份分组的文章列表
 */
import { useMemo } from "react";
import { Link } from "react-router";
import { listPosts } from "@/lib/blog-data";
import { formatDate, postUrl } from "@/pages/Home";

export default function Archive() {
  const posts = listPosts();

  const byYear = useMemo(() => {
    type Item = (typeof posts)[number];
    const map = new Map<string, Item[]>();
    posts.forEach((p) => {
      const year = p.publishedAt ? p.publishedAt.slice(0, 4) : "未注明日期";
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(p);
    });
    return [...map.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [posts]);

  return (
    <div className="page">
      <header className="post-header">
        <h1 className="grad-text">归档</h1>
        <div className="post-meta-row">
          <span>{posts.length} 篇文章</span>
        </div>
      </header>

      {byYear.map(([year, yearPosts]) => (
          <section key={year} className="mb-10">
            <h2 className="section-label grad-text">{year}</h2>
            <hr className="section-rule" />
            <ul className="post-list !mb-4">
              {yearPosts.map((p) => (
                <li key={p.slug}>
                  <Link className="post-row !py-3" to={postUrl(p.slug)}>
                    <div className="post-row-top">
                      <span className="post-date">{formatDate(p.publishedAt)}</span>
                      <span className="post-title !text-base">{p.title}</span>
                      <span className="post-path-hint hidden md:inline">{p.slug}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

      {posts.length === 0 && (
        <div className="empty-block">
          <div className="empty-title">暂无文章</div>
        </div>
      )}
    </div>
  );
}
