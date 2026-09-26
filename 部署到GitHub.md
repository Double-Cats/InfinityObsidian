# 把博客搬到 GitHub（全程网页操作，不用敲命令）

这个压缩包里是你的博客网站。搬到 GitHub 之后：

- 博客网址会是 `https://你的用户名.github.io/InfinityObsidian/`
- **更新文章 = 往仓库的 `content/` 文件夹里拖 md 文件**（网页操作，几十秒后网站自动更新）
- 在 Obsidian 里照常写作，写完把整个仓库文件夹拖进 `content/` 即可，图片附件（png/jpg 等）一起拖，文章里的 `![[图片名.png]]` 会自动显示

---

## 第一次部署（约 5 分钟）

### 第 1 步：建仓库

1. 打开 <https://github.com>，登录（没有账号就用邮箱免费注册一个）。
2. 点右上角 **「+」→「New repository」**。
3. Repository name 填 **`InfinityObsidian`**（必须一字不差，不然网址会对不上）。
4. 其他都不用动，点绿色按钮 **Create repository**。

### 第 2 步：上传文件

1. 建好后的页面中间有一行小字 **「uploading an existing file」**，点它。
2. 把压缩包**解压出来的所有文件和文件夹**（src、content、scripts、.github、package.json 等）全部拖进网页。
   - 注意：`.github` 文件夹必须拖进去（它是自动构建的开关）。如果浏览器不让你拖以点开头的文件夹，就改用「choose your files」逐个选，或者先把 `.github` 改名 `github` 上传后再在网页上 Rename 回 `.github`。
3. 等传完，点页面最下方的绿色按钮 **Commit changes**。

### 第 3 步：打开 GitHub Pages

1. 在仓库页面点上方 **「Settings」**（齿轮图标）。
2. 左侧菜单点 **「Pages」**。
3. 「Build and deployment」下面的 **Source** 选 **「GitHub Actions」**。

### 第 4 步：等它自己跑完

1. 点仓库页面上方的 **「Actions」** 标签，会看到一个叫「构建并部署到 GitHub Pages」的任务在跑（黄点 = 进行中）。
2. 等 1～3 分钟变成**绿色对勾**，打开 `https://你的用户名.github.io/InfinityObsidian/` 就能看到博客了。

如果 Action 是红叉：点进去看哪一步失败，最常见是 `.github` 文件夹没传上去，回第 2 步补传。

---

## 以后更新文章（每次约 1 分钟）

1. 在仓库页面点进 **`content/`** 文件夹。
2. 点右上角 **「Add file」→「Upload files」**，把你 Obsidian 库里的 `.md` 文件（和图片附件）拖进去，点 **Commit changes**。
3. 去「Actions」看绿色对勾出现（约 1 分钟），刷新博客就有新文章了。

删文章：点进那个文件 → 右上角「⋯」→「Delete file」→ Commit。
改文章：点进文件 → 铅笔图标编辑 → Commit（当然更推荐在 Obsidian 里改完重新拖上来覆盖）。

### 文章里的小约定

- md 文件开头可以加这样的头部，控制标题、标签和发布日期（不加也行，会自动取文件名当标题）：

  ```
  ---
  title: 我的文章标题
  tags: [标签一, 标签二]
  created: 2026-09-27
  ---
  ```

- 双链 `[[另一篇笔记]]`、嵌入 `![[另一篇笔记]]`、高亮 `==文字==`、callout、LaTeX 公式、mermaid 图都和 Obsidian 里一样有效。
- 图片放在 content/ 里任意位置都行，文章里写 `![[图片名.png]]` 就能显示（按文件名找，与 Obsidian 一致）。

---

## 改博客名字和签名

仓库根目录的 **`site.config.json`**，点进去 → 铅笔图标，改这三项，Commit 后自动生效：

```json
{
  "blogTitle": "Infinity Obsidian",
  "tagline": "把 Obsidian 仓库，变成所有人都能读的博客",
  "authorName": "站长"
}
```

## 常见问题

- **打开网址是 404**：检查仓库名是不是正好是 `InfinityObsidian`；Settings → Pages 的 Source 是不是选了 GitHub Actions；Actions 里最近一次是不是绿勾。
- **文章没出现**：文件必须放在 `content/` 文件夹里且以 `.md` 结尾；去 Actions 看构建有没有报错。
- **想把博客挂到自己的域名**：Settings → Pages → Custom domain，按 GitHub 提示填域名即可（这一步可选）。
