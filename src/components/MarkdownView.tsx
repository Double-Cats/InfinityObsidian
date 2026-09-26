/**
 * src/components/MarkdownView.tsx — Markdown 渲染容器
 * 负责：渲染 HTML、mermaid 后处理、笔记嵌入异步填充、点击委托
 */
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { renderMarkdown } from "@/lib/obsidian-md";
import { notePeek, resolveLink, listAttachments } from "@/lib/blog-data";

interface Props {
  /** 不含 frontmatter 的 Markdown 正文 */
  body: string;
  /** title（小写）→ slug，用于双链直接跳转 */
  titleIndex?: Record<string, string>;
  className?: string;
}

type MermaidApi = typeof import("mermaid").default;
let mermaidPromise: Promise<MermaidApi> | null = null;
let mermaidSeq = 0;

async function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          darkMode: true,
          background: "#16141f",
          primaryColor: "#2a2440",
          primaryBorderColor: "#6d5bd0",
          primaryTextColor: "#d6cfe8",
          lineColor: "#8b7dd8",
          fontFamily: "inherit",
        },
      });
      return m.default;
    });
  }
  return mermaidPromise;
}

export default function MarkdownView({ body, titleIndex, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const html = useMemo(() => renderMarkdown(body, { attachmentUrls: listAttachments() }), [body]);

  /* 后处理：mermaid + 笔记嵌入 */
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // mermaid（按需加载）
    const mermaids = Array.from(root.querySelectorAll<HTMLElement>("pre.mermaid:not(.mermaid-done)"));
    if (mermaids.length) {
      void loadMermaid().then((mermaid) => {
        for (const node of mermaids) {
          const source = node.textContent ?? "";
          node.classList.add("mermaid-done");
          const id = `mmd-${++mermaidSeq}`;
          mermaid
            .render(id, source)
            .then(({ svg }) => {
              node.classList.add("mermaid-svg");
              node.innerHTML = svg;
            })
            .catch(() => {
              node.classList.add("mermaid-source");
              const note = document.createElement("div");
              note.className = "mermaid-fallback-note";
              note.textContent = "Mermaid 渲染失败，显示图源码";
              node.parentElement?.appendChild(note);
            });
        }
      });
    }

    // 笔记嵌入（静态数据，同步填充）
    const embeds = Array.from(root.querySelectorAll<HTMLElement>(".note-embed:not([data-filled])"));
    for (const box of embeds) {
      box.dataset.filled = "1";
      const target = box.dataset.embedNote ?? "";
      const peek = notePeek(target);
      if (!peek) {
        box.innerHTML =
          `<div class="note-embed-title">${escapeHtml(target)}</div>` +
          `<div class="note-embed-missing">这篇笔记尚未发布。</div>`;
        continue;
      }
      const excerptHtml = renderMarkdown(peek.content.split(/\n/).slice(0, 14).join("\n"), {
        attachmentUrls: listAttachments(),
      });
      box.innerHTML =
        `<a class="note-embed-title" href="${import.meta.env.BASE_URL}#/post/${peek.slug.split("/").map(encodeURIComponent).join("/")}" data-embed-slug="${escapeHtml(peek.slug)}">${escapeHtml(peek.title)}</a>` +
        `<div class="note-embed-body">${excerptHtml}</div>`;
      box.dataset.resolved = "1";
    }
  }, [html, titleIndex]);

  /* 点击委托：双链 / 标签 / callout 折叠 */
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;

      const wiki = el.closest<HTMLAnchorElement>("a.wikilink");
      if (wiki) {
        e.preventDefault();
        const target = wiki.dataset.wikiTarget ?? "";
        const hit = resolveLink(target) ?? (titleIndex?.[target.toLowerCase()]
          ? { slug: titleIndex[target.toLowerCase()] }
          : null);
        if (hit) {
          navigate(`/post/${hit.slug.split("/").map(encodeURIComponent).join("/")}`);
        } else {
          wiki.classList.add("wikilink-dangling");
          wiki.title = "这篇笔记尚未发布";
        }
        return;
      }

      const tag = el.closest<HTMLElement>("[data-tag]");
      if (tag) {
        e.preventDefault();
        navigate(`/tags/${encodeURIComponent(tag.dataset.tag ?? "")}`);
        return;
      }

      const embedLink = el.closest<HTMLAnchorElement>("a.note-embed-title[data-embed-slug]");
      if (embedLink) {
        e.preventDefault();
        const slug = embedLink.dataset.embedSlug ?? "";
        navigate(`/post/${slug.split("/").map(encodeURIComponent).join("/")}`);
        return;
      }

      const calloutTitle = el.closest(".callout-title");
      if (calloutTitle) {
        calloutTitle.parentElement?.classList.toggle("callout-folded");
      }
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [navigate, titleIndex]);

  return (
    <div
      ref={ref}
      className={`md-body ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}
