/**
 * src/pages/Tags.tsx — 标签云 + 按标签筛选文章
 */
import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { listPosts } from "@/lib/blog-data";
import { formatDate, postUrl } from "@/pages/Home";

export default function Tags() {
  const { tag } = useParams<{ tag: string }>();
  const activeTag = tag ? decodeURIComponent(tag) : null;
  const posts = listPosts();

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p) =>
      p.tags.forEach((t: string) => map.set(t, (map.get(t) ?? 0) + 1)),
    );
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const filtered = useMemo(() => {
    if (!activeTag) return [];
    return posts.filter((p) => p.tags.includes(activeTag));
  }, [posts, activeTag]);

  return (
    <div className="page">
      <header className="post-header">
        <h1 className="grad-text">{activeTag ? `#${activeTag}` : "标签"}</h1>
        <div className="post-meta-row">
          {activeTag ? (
            <span>{filtered.length} 篇文章</span>
          ) : (
            <span>{tagCounts.length} 个标签</span>
          )}
        </div>
      </header>

      <div className="tag-cloud">
          {tagCounts.map(([t, count]) => (
            <Link
              key={t}
              to={`/tags/${encodeURIComponent(t)}`}
              className="md-tag"
              style={
                activeTag === t
                  ? { background: "rgba(168,138,250,0.3)", color: "#fff" }
                  : undefined
              }
            >
              #{t}
              <span className="tag-count">{count}</span>
            </Link>
          ))}
          {tagCounts.length === 0 && (
            <span className="text-sm text-[--pv-muted]">暂无标签</span>
          )}
      </div>

      {activeTag && (
        <ul className="post-list">
          {filtered.map((p) => (
            <li key={p.slug}>
              <Link className="post-row" to={postUrl(p.slug)}>
                <div className="post-row-top">
                  <span className="post-date">{formatDate(p.publishedAt)}</span>
                  <span className="post-title">{p.title}</span>
                </div>
                {p.excerpt && <div className="post-excerpt">{p.excerpt}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
