#!/usr/bin/env node
/**
 * scripts/build-content.mjs — 构建期内容编译器
 *
 * 扫描 content/ 目录：
 *   - *.md        → 解析 frontmatter/标签/双链/摘要，生成文章索引
 *   - 其他文件     → 作为附件，拷贝到 public/attachments/，并生成
 *                   「文件名(小写) → URL」映射（供 ![[图片.png]] 解析）
 * 输出 src/generated/content-index.ts，被前端直接 import。
 *
 * 配置：读取 site.config.json（可选），字段 blogTitle / tagline / authorName。
 * 用法：node scripts/build-content.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// createRequire 以脚本位置为基准，typescript 应在 ROOT/node_modules 里
const tsPath = require.resolve("typescript", { paths: [ROOT] });
const tsModule = await import(pathToFileURL(tsPath).href);
const ts = tsModule.default ?? tsModule;
const CONTENT_DIR = path.join(ROOT, "content");
const ATT_OUT_DIR = path.join(ROOT, "public", "attachments");
const GENERATED = path.join(ROOT, "src", "generated");
const SHARED_TS = path.join(ROOT, "src", "lib", "obsidian-shared.ts");
const SITE_CONFIG = path.join(ROOT, "site.config.json");

// —— 用 TypeScript 自带的 transpile 复用 src/lib/obsidian-shared.ts（单一事实来源）
const sharedSrc = fs.readFileSync(SHARED_TS, "utf-8");
const sharedJs = ts.transpileModule(sharedSrc, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const shared = await import(
  "data:text/javascript;base64," + Buffer.from(sharedJs).toString("base64")
);
const {
  parseFrontmatter,
  collectTags,
  collectLinks,
  collectAttachmentRefs,
  slugFromPath,
  titleFrom,
  excerptOf,
  wordCountOf,
  attachmentKind,
} = shared;

// —— 站点配置
let settings = { blogTitle: "Infinity Obsidian", tagline: "把 Obsidian 仓库，变成所有人都能读的博客", authorName: "站长" };
if (fs.existsSync(SITE_CONFIG)) {
  settings = { ...settings, ...JSON.parse(fs.readFileSync(SITE_CONFIG, "utf-8")) };
}

// —— 递归收集文件
function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = fs.existsSync(CONTENT_DIR) ? walk(CONTENT_DIR) : [];
const posts = [];
const attachments = {}; // lower-case basename -> { url, kind }
let copied = 0;

fs.rmSync(ATT_OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(ATT_OUT_DIR, { recursive: true });

for (const full of files) {
  const rel = path.relative(CONTENT_DIR, full).split(path.sep).join("/");
  if (/\.md$/i.test(rel)) {
    const text = fs.readFileSync(full, "utf-8");
    const { body, meta } = parseFrontmatter(text);
    posts.push({
      slug: slugFromPath(rel),
      path: rel,
      title: titleFrom(rel, meta),
      content: body,
      excerpt: excerptOf(text),
      tags: collectTags(text),
      links: [...new Set(collectLinks(text).map((l) => l.target))],
      meta: meta.map((e) => ({ key: e.key, values: e.values })),
      wordCount: wordCountOf(text),
      publishedAt: shared.metaValue?.(meta, "created") ?? shared.metaValue?.(meta, "date") ?? shared.metaValue?.(meta, "published") ?? null,
    });
  } else {
    // 附件：用「路径的 URI 编码」做文件名，避免重名覆盖；映射按 basename（与 Obsidian 一致）
    const url = "attachments/" + rel.split("/").map(encodeURIComponent).join("/");
    const base = path.basename(rel).toLowerCase();
    if (!attachments[base]) {
      fs.mkdirSync(path.dirname(path.join(ATT_OUT_DIR, rel)), { recursive: true });
      fs.copyFileSync(full, path.join(ATT_OUT_DIR, rel));
      attachments[base] = { url, kind: attachmentKind(base) };
      copied++;
    }
  }
}

// 发布时间排序（新 → 旧），无日期的排最后
posts.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

// 反向链接：内容里出现 [[标题 的笔记互相记录
const byTitle = new Map();
for (const p of posts) {
  byTitle.set(p.title.toLowerCase(), p);
  byTitle.set(p.path.replace(/\.md$/i, "").toLowerCase(), p);
}
const backlinks = {};
for (const p of posts) {
  for (const l of p.links) {
    const t = byTitle.get(l.toLowerCase());
    if (t && t.slug !== p.slug) {
      (backlinks[t.slug] ??= []).push({ slug: p.slug, title: p.title });
    }
  }
}
for (const p of posts) p.backlinks = backlinks[p.slug] ?? [];

fs.mkdirSync(GENERATED, { recursive: true });
const header = "// 本文件由 scripts/build-content.mjs 自动生成，请勿手改。\n// 更新文章：把 md 文件放进 content/ 再重新构建即可。\n";
const out =
  header +
  `export const settings = ${JSON.stringify(settings, null, 2)} as const;\n\n` +
  `export const attachments: Record<string, { url: string; kind: string }> = ${JSON.stringify(attachments, null, 2)};\n\n` +
  `export interface PostEntry {\n` +
  `  slug: string; path: string; title: string; content: string; excerpt: string;\n` +
  `  tags: string[]; links: string[]; meta: { key: string; values: string[] }[];\n` +
  `  wordCount: number; publishedAt: string | null;\n` +
  `  backlinks: { slug: string; title: string }[];\n` +
  `}\n\n` +
  `export const posts: PostEntry[] = ${JSON.stringify(posts, null, 2)};\n`;

fs.writeFileSync(path.join(GENERATED, "content-index.ts"), out);
console.log(`内容编译完成：${posts.length} 篇文章，${copied} 个附件 → src/generated/content-index.ts`);
