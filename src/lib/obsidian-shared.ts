/**
 * contracts/obsidian.ts — 前后端共享的 Obsidian 笔记解析工具
 * （frontmatter、标签、双链收集、slug、摘要）
 */

export interface FrontmatterEntry {
  key: string;
  values: string[];
}

export interface ParsedWikilink {
  target: string;
  heading: string | null;
  alias: string | null;
  embed: boolean;
}

function stripQuotes(s: string): string {
  if (
    s.length >= 2 &&
    ((s[0] === '"' && s[s.length - 1] === '"') ||
      (s[0] === "'" && s[s.length - 1] === "'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

/** 解析 YAML frontmatter（支持标量、行内数组、- 列表） */
export function parseFrontmatter(text: string): { body: string; meta: FrontmatterEntry[] } {
  const src = String(text);
  if (!/^---[ \t]*\r?\n/.test(src)) return { body: src, meta: [] };
  const m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(src);
  if (!m) return { body: src, meta: [] };
  const meta: FrontmatterEntry[] = [];
  let current: FrontmatterEntry | null = null;
  for (const line of m[1].split(/\r?\n/)) {
    const km = /^([A-Za-z0-9_\- ]+):[ \t]*(.*)$/.exec(line);
    const lm = /^[ \t]+-[ \t]+(.*)$/.exec(line);
    if (km) {
      current = { key: km[1].trim(), values: [] };
      const v = km[2].trim();
      if (v === "") {
        // 等待下方列表项
      } else if (/^\[.*\]$/.test(v)) {
        for (const s of v.slice(1, -1).split(",")) {
          const clean = stripQuotes(s.trim());
          if (clean) current.values.push(clean);
        }
      } else {
        current.values.push(stripQuotes(v));
      }
      meta.push(current);
    } else if (lm && current) {
      const item = stripQuotes(lm[1].trim());
      if (item) current.values.push(item);
    }
  }
  return { body: src.slice(m[0].length), meta: meta.filter((e) => e.values.length > 0) };
}

export function metaValue(meta: FrontmatterEntry[], key: string): string | null {
  for (const entry of meta) {
    if (entry.key.toLowerCase() === key.toLowerCase()) return entry.values[0] ?? null;
  }
  return null;
}

/** 去掉代码块 / 行内代码 / 注释，避免误收集 */
export function stripCode(text: string): string {
  return String(text)
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/%%[\s\S]*?%%/g, " ");
}

const TAG_RE = /(^|[\s"'([{【（「『、，。；：:;])#([\p{L}\p{N}_\-/]+)/gmu;

function isValidTag(tag: string): boolean {
  return /[\p{L}_\-/]/u.test(tag);
}

/** 收集正文 + frontmatter 中的全部标签 */
export function collectTags(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const { body, meta } = parseFrontmatter(text);
  const cleaned = stripCode(body);
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(cleaned)) !== null) {
    const tag = m[2].replace(/[\/\-_]+$/, "");
    if (tag && isValidTag(tag) && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  for (const entry of meta) {
    if (/^tags?$/i.test(entry.key)) {
      for (const raw of entry.values) {
        const t = raw.replace(/^#/, "");
        if (t && !seen.has(t)) {
          seen.add(t);
          out.push(t);
        }
      }
    }
  }
  return out;
}

/** 解析 [[目标#标题|别名]] */
export function parseWikilinkRaw(raw: string): ParsedWikilink {
  let target = String(raw);
  let alias: string | null = null;
  let heading: string | null = null;
  const pipe = target.indexOf("|");
  if (pipe !== -1) {
    alias = target.slice(pipe + 1).trim() || null;
    target = target.slice(0, pipe);
  }
  const hash = target.indexOf("#");
  if (hash !== -1) {
    heading = target.slice(hash + 1).trim() || null;
    target = target.slice(0, hash);
  }
  return { target: target.trim(), heading, alias, embed: false };
}

/** 收集笔记中的全部 [[链接]] 与 ![[嵌入]] */
export function collectLinks(text: string): ParsedWikilink[] {
  const out: ParsedWikilink[] = [];
  const body = stripCode(parseFrontmatter(text).body);
  const re = /(!?)\[\[([^\]\n]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    out.push({ ...parseWikilinkRaw(m[2]), embed: m[1] === "!" });
  }
  return out;
}

const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "ico"];
const AUDIO_EXTS = ["mp3", "wav", "ogg", "flac", "m4a"];
const VIDEO_EXTS = ["mp4", "webm", "mov", "mkv"];

export function extOf(name: string): string {
  const clean = String(name).split(/[?#]/)[0];
  const i = clean.lastIndexOf(".");
  return i === -1 ? "" : clean.slice(i + 1).toLowerCase();
}

export function baseName(p: string): string {
  const parts = String(p).replace(/\\/g, "/").split("/");
  return parts[parts.length - 1];
}

export function attachmentKind(name: string): "image" | "audio" | "video" | "pdf" | null {
  const ext = extOf(name);
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (AUDIO_EXTS.includes(ext)) return "audio";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  return null;
}

/** 收集笔记引用的附件文件名（![[x.png]] 与 ![](x.png)） */
export function collectAttachmentRefs(text: string): string[] {
  const out = new Set<string>();
  for (const link of collectLinks(text)) {
    if (link.embed && attachmentKind(link.target)) out.add(baseName(link.target));
  }
  const body = stripCode(parseFrontmatter(text).body);
  const imgRe = /!\[[^\]]*\]\(([^)\s]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(body)) !== null) {
    const src = decodeURIComponent(m[1]);
    if (!/^(https?:|data:|blob:|\/|#)/i.test(src) && attachmentKind(src)) {
      out.add(baseName(src));
    }
  }
  return [...out];
}

/** 由库内路径生成 URL slug（保留目录层级，逐段编码） */
export function slugFromPath(path: string): string {
  const clean = String(path).replace(/\\/g, "/").replace(/^\.?\//, "").replace(/\.(md|markdown)$/i, "");
  return clean.split("/").map(encodeURIComponent).join("/");
}

/** 笔记标题：frontmatter title > 文件名 */
export function titleFrom(path: string, meta: FrontmatterEntry[]): string {
  return metaValue(meta, "title") ?? baseName(path).replace(/\.(md|markdown)$/i, "");
}

/** 生成纯文本摘要 */
export function excerptOf(text: string, maxLen = 160): string {
  const { body } = parseFrontmatter(text);
  const plain = stripCode(body)
    .replace(/^#+\s+/gm, "")
    .replace(/!?\[\[([^\]|]*\|)?([^\]]+)\]\]/g, "$2")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^>.*$/gm, " ")
    .replace(/[*_~=#|>`-]+/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain;
}

/** 正文「字数」（去除空白后的字符数） */
export function wordCountOf(text: string): number {
  return stripCode(parseFrontmatter(text).body).replace(/\s/g, "").length;
}
