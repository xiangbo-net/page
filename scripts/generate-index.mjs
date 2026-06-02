// scripts/generate-index.mjs
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const OUTPUT_FILE = path.join(REPO_ROOT, "index.html");

// 你可以按需增删排除项
const EXCLUDE_DIRS = new Set([
  ".git",
  ".github",
  "node_modules",
  "dist",
  ".wrangler",
]);

const EXCLUDE_FILES = new Set([
  "index.html", // 防止把自己列进去造成噪音（也可改成允许列出）
  ".DS_Store",
]);

const EXCLUDE_EXTS = new Set([
  // ".psd"
]);

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function isHiddenName(name) {
  return name.startsWith(".");
}

function shouldExclude(relPath, dirent) {
  const name = dirent.name;

  if (dirent.isDirectory()) {
    if (EXCLUDE_DIRS.has(name)) return true;
    // 可选：排除隐藏目录
    // if (isHiddenName(name)) return true;
    return false;
  }

  if (dirent.isFile()) {
    if (EXCLUDE_FILES.has(name)) return true;

    const ext = path.extname(name).toLowerCase();
    if (EXCLUDE_EXTS.has(ext)) return true;

    // 可选：排除隐藏文件
    // if (isHiddenName(name)) return true;

    return false;
  }

  // 其它类型（符号链接等）默认排除
  return true;
}

function readTree(dirAbs, dirRel = "") {
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });

  // 目录在前、文件在后；同类按字母排序
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name, "en");
  });

  const children = [];

  for (const ent of entries) {
    const childRel = dirRel ? path.join(dirRel, ent.name) : ent.name;
    const childAbs = path.join(dirAbs, ent.name);

    if (shouldExclude(childRel, ent)) continue;

    if (ent.isDirectory()) {
      const sub = readTree(childAbs, childRel);
      // 空目录不显示（Git 也不会保存空目录）
      if (sub.children.length > 0) {
        children.push({
          type: "dir",
          name: ent.name,
          rel: childRel,
          children: sub.children,
        });
      }
    } else if (ent.isFile()) {
      children.push({
        type: "file",
        name: ent.name,
        rel: childRel,
      });
    }
  }

  return { children };
}

function renderTree(nodes) {
  let html = "<ul>\n";
  for (const n of nodes) {
    if (n.type === "dir") {
      html += `<li class="dir"><details open><summary>${escapeHtml(
        n.name
      )}/</summary>\n`;
      html += renderTree(n.children);
      html += `</details></li>\n`;
    } else {
      const href = encodeURI(toPosix(n.rel));
      html += `<li class="file"><a href="./${href}">${escapeHtml(
        n.name
      )}</a></li>\n`;
    }
  }
  html += "</ul>\n";
  return html;
}

const tree = readTree(REPO_ROOT);
const body = renderTree(tree.children);

const now = new Date().toISOString();

const out = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>File Index</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,"Noto Sans","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
           margin: 24px; line-height: 1.5; color: #111; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
    ul { list-style: none; padding-left: 18px; margin: 6px 0; }
    li { margin: 2px 0; }
    a { text-decoration: none; color: #0b57d0; }
    a:hover { text-decoration: underline; }
    summary { cursor: pointer; }
    .dir > details > summary { font-weight: 600; }
    .file::before { content: "📄 "; }
    .dir > details > summary::before { content: "📁 "; }
    code { background: #f5f5f5; padding: 1px 6px; border-radius: 6px; }
  </style>
</head>
<body>
  <h1>文件目录</h1>
  <div class="meta">自动生成于 <code>${now}</code>（递归列出所有子文件夹）</div>
  ${body}
</body>
</html>
`;

fs.writeFileSync(OUTPUT_FILE, out, "utf8");
console.log(`Generated ${OUTPUT_FILE}`);
