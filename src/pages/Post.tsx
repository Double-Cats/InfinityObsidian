/**
 * src/pages/Post.tsx — 文章页：正文渲染 + 大纲 + 属性面板 + 反向链接
 */
import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router";
import MarkdownView from "@/components/MarkdownView";
import { formatDate, postUrl } from "@/pages/Home";
import { getPost, listPosts } from "@/lib/blog-data";
import { settings } from "@/generated/content-index";
import type { FrontmatterEntry } from "@/lib/obsidian-shared";

export default function Post() {
  const params = useParams();
  // React Router 已对 params 做过一次 decode；数据库 slug 是逐段 encodeURIComponent 的形式，
  // 这里 re-encode 回去保持一致（对 URL 中 encoded / decoded 两种访问都成立）。
    const raw = params["*"] ?? "";
  const variants = [
    raw,
    raw.split("/").map((seg) => encodeURIComponent(seg)).join("/"),
    decodeURIComponent(raw),
  ];

  const post = variants.map((v) => getPost(v)).find(Boolean);

  const allPosts = listPosts();

  const titleIndex = useMemo(() => {
    const map: Record<string, string> = {};
    allPosts.forEach((p) => {
      map[p.title.toLowerCase()] = p.slug;
      // 同时收录「路径 basename」，与 Obsidian 双链解析一致
      const base = p.path.replace(/\.md$/i, "").split("/").pop()!;
      map[base.toLowerCase()] = p.slug;
    });
    return map;
  }, [allPosts]);

  useEffect(() => {
    if (post) document.title = `${post.title} · ${settings.blogTitle}`;
    return () => {
      document.title = settings.blogTitle;
    };
  }, [post]);

  const toc = useMemo(() => {
    if (!post) return [];
    const out: { level: number; text: string }[] = [];
    const re = /^(#{1,3})\s+(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(post.content)) !== null) {
      out.push({ level: m[1].length, text: m[2].replace(/[#*_~`\[\]]/g, "").trim() });
    }
    return out;
  }, [post]);

  const extraMeta = useMemo(() => {
    if (!post) return [] as FrontmatterEntry[];
    return (post.meta as FrontmatterEntry[]).filter(
      (e) => !/^(title|tags?)$/i.test(e.key),
    );
  }, [post]);

  if (!post) {
    return (
      <div className="page">
        <div className="empty-block">
          <div className="empty-title">没有找到这篇文章</div>
          <p>
            <Link to="/" className="underline text-[--pv-accent]">
              返回首页
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="post-header">
        <Link to="/" className="text-sm text-[--pv-muted] no-underline hover:text-[--pv-accent]">
          ← 返回文章列表
        </Link>
        <h1>{post.title}</h1>
        <div className="post-meta-row">
          <span>{formatDate(post.publishedAt)}</span>
          <span className="dot">·</span>
          <span>{post.wordCount} 字</span>
          {post.tags.length > 0 && (
            <>
              <span className="dot">·</span>
              <span className="flex gap-1.5 flex-wrap">
                {post.tags.map((t: string) => (
                  <Link key={t} className="md-tag" to={`/tags/${encodeURIComponent(t)}`}>
                    #{t}
                  </Link>
                ))}
              </span>
            </>
          )}
        </div>
      </header>

      <div className="post-layout">
        <article className="min-w-0">
          {extraMeta.length > 0 && (
            <div className="properties">
              <div className="properties-head">
                <span>属性</span>
              </div>
              <div className="properties-body">
                {extraMeta.map((entry) => (
                  <div className="prop-row" key={entry.key}>
                    <div className="prop-key">{entry.key}</div>
                    <div className="prop-val">{entry.values.join("，")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <MarkdownView body={post.content} titleIndex={titleIndex} />

          {post.backlinks.length > 0 && (
            <section className="backlinks">
              <div className="post-toc-label">反向链接</div>
              {post.backlinks.map((b) => (
                <Link key={b.slug} className="backlink-row" to={postUrl(b.slug)}>
                  <span className="bl-title">{b.title}</span>
                  <span className="bl-hint">提到了本文</span>
                </Link>
              ))}
            </section>
          )}
        </article>

        {toc.length > 1 && (
          <aside className="post-toc">
            <div className="post-toc-label">大纲</div>
            {toc.map((h, i) => (
              <a
                key={i}
                href={`#h-${i}`}
                className={h.level >= 3 ? "toc-h3" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  const headings = document.querySelectorAll(".md-body h1, .md-body h2, .md-body h3");
                  const target = headings[i];
                  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {h.text}
              </a>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}
