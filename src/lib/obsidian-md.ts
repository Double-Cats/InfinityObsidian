/**
 * src/lib/obsidian-md.ts — Obsidian Markdown 渲染器（React 版）
 * 输出 HTML 字符串；wikilink / 嵌入 / 附件渲染为带 data-* 的占位，
 * 由 MarkdownView 组件做后处理与事件委托。
 */
import MarkdownIt from "markdown-it";
import markdownitFootnote from "markdown-it-footnote";
import hljs from "highlight.js/lib/core";
import katex from "katex";
import "katex/dist/katex.min.css";
import { attachmentKind, baseName, parseWikilinkRaw } from "@/lib/obsidian-shared";

import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import nginx from "highlight.js/lib/languages/nginx";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("shell", bash);
hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("css", css);
hljs.registerLanguage("diff", diff);
hljs.registerLanguage("dockerfile", dockerfile);
hljs.registerLanguage("go", go);
hljs.registerLanguage("ini", ini);
hljs.registerLanguage("toml", ini);
hljs.registerLanguage("java", java);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("nginx", nginx);
hljs.registerLanguage("python", python);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("yaml", yaml);

export interface RenderEnv {
  /** 附件名（小写）→ 可渲染 URL */
  attachmentUrls?: Record<string, string>;
}

const CALLOUT_LABELS: Record<string, string> = {
  note: "备注", info: "信息", todo: "待办", tip: "提示", hint: "提示",
  important: "重要", success: "成功", check: "完成", done: "完成",
  question: "问题", help: "帮助", faq: "常见问题",
  warning: "警告", caution: "注意", attention: "注意",
  failure: "失败", fail: "失败", missing: "缺失",
  danger: "危险", error: "错误", bug: "缺陷",
  example: "示例", quote: "引用", cite: "引用",
  abstract: "摘要", summary: "摘要", tldr: "摘要",
};

function iconSvg(path: string): string {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

const CALLOUT_ICONS: Record<string, string> = {
  note: iconSvg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  warning: iconSvg('<path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  danger: iconSvg('<path d="m12 2 10 18H2Z"/><path d="M12 9v5"/><path d="M12 17.5h.01"/>'),
  tip: iconSvg('<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2Z"/>'),
  question: iconSvg('<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'),
  quote: iconSvg('<path d="M3 21c3 0 7-1 7-8V5c0-1.2-.8-2-2-2H5c-1.2 0-2 .8-2 2v6c0 1.2.8 2 2 2h1c0 3-1 4-3 4z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.2-.8-2-2-2h-3c-1.2 0-2 .8-2 2v6c0 1.2.8 2 2 2h1c0 3-1 4-3 4z"/>'),
  success: iconSvg('<path d="M20 6 9 17l-5-5"/>'),
  error: iconSvg('<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>'),
};
CALLOUT_ICONS.info = CALLOUT_ICONS.note;
CALLOUT_ICONS.todo = CALLOUT_ICONS.success;
CALLOUT_ICONS.check = CALLOUT_ICONS.success;
CALLOUT_ICONS.done = CALLOUT_ICONS.success;
CALLOUT_ICONS.hint = CALLOUT_ICONS.tip;
CALLOUT_ICONS.important = CALLOUT_ICONS.tip;
CALLOUT_ICONS.help = CALLOUT_ICONS.question;
CALLOUT_ICONS.faq = CALLOUT_ICONS.question;
CALLOUT_ICONS.caution = CALLOUT_ICONS.warning;
CALLOUT_ICONS.attention = CALLOUT_ICONS.warning;
CALLOUT_ICONS.fail = CALLOUT_ICONS.error;
CALLOUT_ICONS.failure = CALLOUT_ICONS.error;
CALLOUT_ICONS.missing = CALLOUT_ICONS.error;
CALLOUT_ICONS.bug = CALLOUT_ICONS.error;
CALLOUT_ICONS.cite = CALLOUT_ICONS.quote;
CALLOUT_ICONS.abstract = CALLOUT_ICONS.note;
CALLOUT_ICONS.summary = CALLOUT_ICONS.note;
CALLOUT_ICONS.tldr = CALLOUT_ICONS.note;

function calloutLabel(type: string): string {
  return CALLOUT_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}
function calloutIcon(type: string): string {
  return CALLOUT_ICONS[type] ?? CALLOUT_ICONS.note;
}

function isValidTag(tag: string): boolean {
  return /[\p{L}_\-/]/u.test(tag);
}

let cached: MarkdownIt | null = null;

export function getMarkdownIt(): MarkdownIt {
  if (cached) return cached;
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false,
    breaks: false,
    highlight(str, lang) {
      try {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(str, { language: lang }).value;
        }
        return hljs.highlightAuto(str).value;
      } catch {
        return "";
      }
    },
  });
  md.use(markdownitFootnote);
  const esc = md.utils.escapeHtml.bind(md.utils);

  /* ---- 内联：[[双链]] ---- */
  md.inline.ruler.push("wikilink", (state, silent) => {
    const pos = state.pos;
    if (state.src.charCodeAt(pos) !== 0x5b || state.src.charCodeAt(pos + 1) !== 0x5b) return false;
    const end = state.src.indexOf("]]", pos + 2);
    if (end === -1) return false;
    const raw = state.src.slice(pos + 2, end);
    if (!raw || raw.length > 300 || raw.includes("\n") || raw.includes("[[")) return false;
    if (!silent) {
      const token = state.push("wikilink", "", 0);
      token.content = raw;
    }
    state.pos = end + 2;
    return true;
  });

  md.renderer.rules.wikilink = (tokens, idx) => {
    const parsed = parseWikilinkRaw(tokens[idx].content);
    const display =
      parsed.alias ??
      (parsed.heading
        ? parsed.target
          ? `${parsed.target} › ${parsed.heading}`
          : parsed.heading
        : parsed.target) ??
      tokens[idx].content;
    return `<a class="wikilink" href="#" data-wiki-target="${esc(parsed.target)}"${
      parsed.heading ? ` data-wiki-heading="${esc(parsed.heading)}"` : ""
    }>${esc(display)}</a>`;
  };

  /* ---- 内联：![[嵌入]] ---- */
  md.inline.ruler.push("embed", (state, silent) => {
    const pos = state.pos;
    if (
      state.src.charCodeAt(pos) !== 0x21 ||
      state.src.charCodeAt(pos + 1) !== 0x5b ||
      state.src.charCodeAt(pos + 2) !== 0x5b
    )
      return false;
    const end = state.src.indexOf("]]", pos + 3);
    if (end === -1) return false;
    const raw = state.src.slice(pos + 3, end);
    if (!raw || raw.length > 300 || raw.includes("\n")) return false;
    if (!silent) {
      const token = state.push("embed", "", 0);
      token.content = raw;
    }
    state.pos = end + 2;
    return true;
  });

  const missingAttachment = (name: string) =>
    `<span class="missing-attachment">附件未发布：${esc(name)}</span>`;

  md.renderer.rules.embed = (tokens, idx, _options, env: RenderEnv) => {
    const parsed = parseWikilinkRaw(tokens[idx].content);
    const target = parsed.target;
    const kind = attachmentKind(target);
    if (!kind) {
      return `<div class="note-embed" data-embed-note="${esc(target)}"></div>`;
    }
    const resolved = env?.attachmentUrls?.[baseName(target).toLowerCase()];
    if (kind === "image") {
      return resolved
        ? `<img class="embed-image" src="${esc(resolved)}" alt="${esc(parsed.alias ?? target)}">`
        : missingAttachment(target);
    }
    if (kind === "audio") {
      return resolved
        ? `<audio controls preload="metadata" src="${esc(resolved)}"></audio>`
        : missingAttachment(target);
    }
    if (kind === "video") {
      return resolved
        ? `<video controls preload="metadata" src="${esc(resolved)}"></video>`
        : missingAttachment(target);
    }
    return resolved
      ? `<a class="md-tag" href="${esc(resolved)}" target="_blank" rel="noopener">PDF：${esc(baseName(target))}</a>`
      : missingAttachment(target);
  };

  /* ---- 内联：==高亮== ---- */
  md.inline.ruler.push("mark", (state, silent) => {
    const pos = state.pos;
    if (state.src.charCodeAt(pos) !== 0x3d || state.src.charCodeAt(pos + 1) !== 0x3d) return false;
    if (state.src.charCodeAt(pos + 2) === 0x3d) return false;
    const end = state.src.indexOf("==", pos + 2);
    if (end === -1) return false;
    const text = state.src.slice(pos + 2, end);
    if (!text || text.includes("\n") || /^\s|\s$/.test(text)) return false;
    if (!silent) {
      state.push("mark_open", "mark", 1);
      const t = state.push("text", "", 0);
      t.content = text;
      state.push("mark_close", "mark", -1);
    }
    state.pos = end + 2;
    return true;
  });

  /* ---- 内联：#标签 ---- */
  md.inline.ruler.push("hashtag", (state, silent) => {
    const pos = state.pos;
    if (state.src.charCodeAt(pos) !== 0x23) return false;
    if (pos > 0) {
      const prev = state.src.charAt(pos - 1);
      if (!/[\s"'([{【（「『、，。；：:;]/.test(prev)) return false;
    }
    const m = /^#([\p{L}\p{N}_\-/]+)/u.exec(state.src.slice(pos));
    if (!m) return false;
    const tag = m[1].replace(/[\/\-_]+$/, "");
    if (!tag || !isValidTag(tag)) return false;
    if (!silent) {
      const token = state.push("hashtag", "", 0);
      token.content = tag;
    }
    state.pos += 1 + m[1].length;
    return true;
  });

  md.renderer.rules.hashtag = (tokens, idx) => {
    const tag = tokens[idx].content;
    return `<a class="md-tag" href="#" data-tag="${esc(tag)}">#${esc(tag)}</a>`;
  };

  /* ---- 内联：%%注释%% ---- */
  md.inline.ruler.push("comment", (state, silent) => {
    const pos = state.pos;
    if (state.src.charCodeAt(pos) !== 0x25 || state.src.charCodeAt(pos + 1) !== 0x25) return false;
    const end = state.src.indexOf("%%", pos + 2);
    if (end === -1) return false;
    if (!silent) {
      /* 直接丢弃 */
    }
    state.pos = end + 2;
    return true;
  });

  /* ---- 内联：$公式$ ---- */
  md.inline.ruler.after("backticks", "math_inline", (state, silent) => {
    const pos = state.pos;
    if (state.src.charCodeAt(pos) !== 0x24) return false;
    if (state.src.charCodeAt(pos + 1) === 0x24) return false;
    const next = state.src.charAt(pos + 1);
    if (!next || /\s/.test(next)) return false;
    let i = pos + 1;
    while (i < state.posMax) {
      const ch = state.src.charAt(i);
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === "\n") return false;
      if (ch === "$") {
        if (/\s/.test(state.src.charAt(i - 1))) return false;
        const after = state.src.charAt(i + 1);
        if (after && /[0-9]/.test(after)) return false;
        break;
      }
      i++;
    }
    if (i >= state.posMax) return false;
    const tex = state.src.slice(pos + 1, i);
    if (!tex) return false;
    if (!silent) {
      const token = state.push("math_inline", "", 0);
      token.content = tex;
    }
    state.pos = i + 1;
    return true;
  });

  md.renderer.rules.math_inline = (tokens, idx) => {
    const tex = tokens[idx].content;
    try {
      return `<span class="math-inline">${katex.renderToString(tex, { throwOnError: false, displayMode: false })}</span>`;
    } catch {
      return `<span class="math-inline math-fallback">${esc(tex)}</span>`;
    }
  };

  /* ---- 块级：$$公式$$ ---- */
  md.block.ruler.before(
    "fence",
    "math_block",
    (state, startLine, endLine, silent) => {
      const pos = state.bMarks[startLine] + state.tShift[startLine];
      const max = state.eMarks[startLine];
      if (pos + 1 >= max) return false;
      if (state.src.charCodeAt(pos) !== 0x24 || state.src.charCodeAt(pos + 1) !== 0x24) return false;
      const first = state.src.slice(pos + 2, max);
      let tex = "";
      let nextLine = startLine + 1;
      let closed = false;
      const closeIdx = first.indexOf("$$");
      if (closeIdx !== -1) {
        if (first.slice(closeIdx + 2).trim()) return false;
        tex = first.slice(0, closeIdx);
        closed = true;
      } else {
        tex = first;
        for (let l = startLine + 1; l < endLine; l++) {
          const lpos = state.bMarks[l] + state.tShift[l];
          const lmax = state.eMarks[l];
          const line = state.src.slice(lpos, lmax);
          const ci = line.indexOf("$$");
          if (ci !== -1) {
            if (line.slice(ci + 2).trim()) return false;
            tex += "\n" + line.slice(0, ci);
            nextLine = l + 1;
            closed = true;
            break;
          }
          tex += "\n" + line;
        }
      }
      if (!closed) return false;
      if (silent) return true;
      state.line = nextLine;
      const token = state.push("math_block", "", 0);
      token.block = true;
      token.content = tex.trim();
      token.map = [startLine, nextLine];
      return true;
    },
  );

  md.renderer.rules.math_block = (tokens, idx) => {
    const tex = tokens[idx].content;
    try {
      return `<div class="math-block">${katex.renderToString(tex, { throwOnError: false, displayMode: true })}</div>\n`;
    } catch {
      return `<div class="math-block math-fallback">${esc(tex)}</div>\n`;
    }
  };

  /* ---- 块级：Callout ---- */
  md.core.ruler.before("inline", "callout", (state) => {
    const tokens = state.tokens;
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i].type !== "blockquote_open") continue;
      let inlineIdx = i + 1;
      if (tokens[inlineIdx] && tokens[inlineIdx].type === "paragraph_open") inlineIdx++;
      const inline = tokens[inlineIdx];
      if (!inline || inline.type !== "inline") continue;
      const nl = inline.content.indexOf("\n");
      const firstLine = (nl === -1 ? inline.content : inline.content.slice(0, nl)).trim();
      const m = /^\[!([A-Za-z][\w-]*)\]\s*([+-])?[ \t]*(.*)$/.exec(firstLine);
      if (!m) continue;
      let depth = 0;
      let closeIdx = -1;
      for (let k = i; k < tokens.length; k++) {
        if (tokens[k].type === "blockquote_open") depth++;
        else if (tokens[k].type === "blockquote_close") {
          if (--depth === 0) {
            closeIdx = k;
            break;
          }
        }
      }
      if (closeIdx === -1) continue;
      const rest = nl === -1 ? "" : inline.content.slice(nl + 1);
      if (rest.trim() === "") {
        const po = inlineIdx - 1;
        if (
          tokens[po] &&
          tokens[po].type === "paragraph_open" &&
          tokens[inlineIdx + 1] &&
          tokens[inlineIdx + 1].type === "paragraph_close"
        ) {
          tokens.splice(po, 3);
          closeIdx -= 3;
        } else {
          inline.content = "";
        }
      } else {
        inline.content = rest;
        if (inline.map) inline.map = [inline.map[0] + 1, inline.map[1]];
      }
      const openTok = tokens[i];
      const closeTok = tokens[closeIdx];
      openTok.type = "callout_open";
      openTok.nesting = 1;
      openTok.meta = { type: m[1].toLowerCase(), fold: m[2] ?? "", title: m[3].trim() };
      closeTok.type = "callout_close";
      closeTok.nesting = -1;
    }
    return true;
  });

  md.renderer.rules.callout_open = (tokens, idx) => {
    const meta = tokens[idx].meta as { type: string; fold: string; title: string };
    const label = meta.title || calloutLabel(meta.type);
    return `<div class="callout${meta.fold === "-" ? " callout-folded" : ""}" data-callout="${esc(meta.type)}">` +
      `<div class="callout-title" role="button" tabindex="0">${calloutIcon(meta.type)}` +
      `<span>${esc(label)}</span><span class="callout-fold">▾</span></div>` +
      `<div class="callout-body">`;
  };
  md.renderer.rules.callout_close = () => "</div></div>";

  /* ---- 块级：任务列表 ---- */
  md.core.ruler.before("inline", "tasklist", (state) => {
    const tokens = state.tokens;
    for (let i = 2; i < tokens.length; i++) {
      if (tokens[i].type !== "inline") continue;
      const para = tokens[i - 1];
      const item = tokens[i - 2];
      if (!para || para.type !== "paragraph_open" || !item || item.type !== "list_item_open") continue;
      const m = /^\[([ xX])\][ \t]+/.exec(tokens[i].content);
      if (!m) continue;
      tokens[i].content = tokens[i].content.slice(m[0].length);
      item.attrJoin("class", "task-list-item");
      const cb = new state.Token("html_inline", "", 0);
      cb.content = `<input type="checkbox" class="task-checkbox" disabled tabindex="-1"${
        m[1].toLowerCase() === "x" ? " checked" : ""
      }>`;
      tokens.splice(i, 0, cb);
      i++;
    }
    return true;
  });

  /* ---- 围栏：mermaid ---- */
  const defaultFence = md.renderer.rules.fence!;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = token.info ? token.info.trim().toLowerCase().split(/\s+/)[0] : "";
    if (info === "mermaid") {
      return `<div class="mermaid-wrap"><pre class="mermaid">${esc(token.content)}</pre></div>\n`;
    }
    return defaultFence(tokens, idx, options, env, self);
  };

  /* ---- 标准图片：附件路径解析 ---- */
  const defaultImage = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, idx, options, env: RenderEnv, self) => {
    const token = tokens[idx];
    const src = token.attrGet("src") ?? "";
    if (!/^(https?:|data:|blob:|\/|#)/i.test(src)) {
      let clean = src;
      try {
        clean = decodeURIComponent(src);
      } catch {
        /* keep raw */
      }
      const resolved = env?.attachmentUrls?.[baseName(clean).toLowerCase()];
      if (resolved) {
        token.attrSet("src", resolved);
      } else {
        return missingAttachment(src);
      }
    }
    return defaultImage(tokens, idx, options, env, self);
  };

  cached = md;
  return md;
}

/** 渲染 Obsidian Markdown 正文（不含 frontmatter） */
export function renderMarkdown(body: string, env: RenderEnv = {}): string {
  return getMarkdownIt().render(body, env);
}
