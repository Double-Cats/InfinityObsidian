/**
 * src/lib/blog-data.ts — 静态数据层
 * 数据在构建期由 scripts/build-content.mjs 编译进 content-index.ts，
 * 运行时零请求、零数据库。
 */
import { posts, settings, attachments } from "@/generated/content-index";
import type { PostEntry } from "@/generated/content-index";

export type { PostEntry };
export { settings };

export interface PostSummary {
  slug: string;
  path: string;
  title: string;
  excerpt: string;
  tags: string[];
  wordCount: number;
  publishedAt: string | null;
}

export function listPosts(): PostSummary[] {
  return posts.map(({ slug, path, title, excerpt, tags, wordCount, publishedAt }) => ({
    slug, path, title, excerpt, tags, wordCount, publishedAt,
  }));
}

export function getPost(slug: string): PostEntry | undefined {
  return posts.find((p) => p.slug === slug);
}

/** 按标题/路径解析双链 → slug（与 Obsidian 的「最短路径优先」一致） */
export function resolveLink(title: string): { slug: string; title: string } | null {
  const t = title.trim().toLowerCase();
  // 1) 精确匹配：完整路径（无扩展名）或标题
  for (const p of posts) {
    if (p.path.replace(/\.md$/i, "").toLowerCase() === t) return { slug: p.slug, title: p.title };
  }
  for (const p of posts) {
    if (p.title.toLowerCase() === t) return { slug: p.slug, title: p.title };
  }
  // 2) basename 匹配：[[日记/2026-09-26]] 与 [[2026-09-26]] 等价
  for (const p of posts) {
    const base = p.path.replace(/\.md$/i, "").split("/").pop()!.toLowerCase();
    if (base === t) return { slug: p.slug, title: p.title };
  }
  return null;
}

/** 笔记嵌入/悬浮预览片段 */
export function notePeek(title: string): { slug: string; title: string; content: string; excerpt: string } | null {
  const hit = resolveLink(title);
  if (!hit) return null;
  const p = getPost(hit.slug)!;
  return { slug: p.slug, title: p.title, content: p.content, excerpt: p.excerpt };
}

/** 附件映射：小写文件名 → { url, kind }（构建期拷贝到 public/attachments/） */
export function attachmentUrl(name: string): { url: string; kind: string } | null {
  const base = name.split("/").pop()!.toLowerCase();
  const hit = attachments[base];
  if (!hit) return null;
  return { url: import.meta.env.BASE_URL + hit.url, kind: hit.kind };
}

/** 全部附件的「小写文件名 → 完整 URL」映射（供 Markdown 渲染器解析 ![[图片]]） */
export function listAttachments(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [base, a] of Object.entries(attachments)) {
    out[base] = import.meta.env.BASE_URL + a.url;
  }
  return out;
}
