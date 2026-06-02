// .github/scripts/generate-index.mjs
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const OUTPUT_FILE = path.join(REPO_ROOT, "index.html");

// 不想在目录页里出现的目录
const EXCLUDE_DIRS = new Set([
  ".git",
  ".github", // 脚本和工作流都放这里，所以必须隐藏
  "node_modules",
  "dist",
  ".wrangler",
]);

// 不想在目录页里出现的文件名
const EXCLUDE_FILES = new Set([
  ".DS_Store",
]);

// 不想出现的扩展名（按需添加）
const EXCLUDE_EXTS = new Set([
  // ".psd",
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

function shouldExclude(relPath, dirent) {
  const name = dirent.name;

  if (dirent.isDirectory()) {
    if (EXCLUDE_DIRS.has(name)) return true;
    return false;
  }

  if (dirent.isFile()) {
    // 关键规则：根目录 index.html 不列出（它就是目录页本身）
    // 但子目录 index.html 要列出（如 ai/index.html）
    if (relPath === "index.html") return true;

    if (EXCLUDE_FILES.has(name)) return true;

    const ext = path.extname(name).toLowerCase();
    if (EXCLUDE_EXTS.has(ext)) return true;

    return false;
  }

  // 其它类型默认排除（符号链接等）
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

function fileBadge(rel) {
  const ext = path.extname(rel).toLowerCase();
  if (!ext) return "FILE";
  return ext.replace(".", "").toUpperCase();
}

function renderTree(nodes) {
  let html = `<ul class="tree">\n`;

  for (const n of nodes) {
    if (n.type === "dir") {
      html += `<li class="node dir">
  <details open>
    <summary>
      <span class="icon">📁</span>
      <span class="name">${escapeHtml(n.name)}</span>
      <span class="hint">/</span>
    </summary>
    ${renderTree(n.children)}
  </details>
</li>\n`;
    } else {
      const href = encodeURI(toPosix(n.rel));
      const badge = fileBadge(n.rel);
      html += `<li class="node file">
  <a class="fileLink" href="./${href}">
    <span class="icon">📄</span>
    <span class="name">${escapeHtml(n.rel)}</span>
    <span class="badge">${escapeHtml(badge)}</span>
  </a>
</li>\n`;
    }
  }

  html += `</ul>\n`;
  return html;
}

const tree = readTree(REPO_ROOT);
const body = renderTree(tree.children);
const now = new Date().toISOString();

const out = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Pages of Xiangbo</title>
  <style>
    :root{
      --bg1:#0b1220;
      --bg2:#0f1b33;
      --card:#111b31cc;
      --stroke:#23304d;
      --text:#e6edf7;
      --muted:#9fb0cc;
      --link:#7dd3fc;
      --badge:#1f2a44;
      --badgeText:#cfe2ff;
      --shadow: 0 20px 60px rgba(0,0,0,.35);
      --radius: 18px;
    }
    *{box-sizing:border-box;}
    body{
      margin:0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif;
      color:var(--text);
      background:
        radial-gradient(1000px 600px at 20% 0%, rgba(125,211,252,.18), transparent 60%),
        radial-gradient(900px 600px at 90% 10%, rgba(167,139,250,.18), transparent 55%),
        linear-gradient(180deg, var(--bg1), var(--bg2));
      min-height:100vh;
    }
    .wrap{
      max-width: 1040px;
      margin: 0 auto;
      padding: 36px 18px 54px;
    }
    header{
      display:flex;
      gap:14px;
      align-items:flex-end;
      justify-content:space-between;
      flex-wrap:wrap;
      margin-bottom: 18px;
    }
    .title{
      display:flex;
      flex-direction:column;
      gap:8px;
    }
    h1{
      margin:0;
      font-size: 26px;
      letter-spacing:.2px;
    }
    .sub{
      color:var(--muted);
      font-size: 13px;
      line-height:1.4;
    }
    .pill{
      font-size:12px;
      color:var(--muted);
      border:1px solid var(--stroke);
      background: rgba(17,27,49,.55);
      padding: 8px 10px;
      border-radius: 999px;
      backdrop-filter: blur(6px);
    }
    .card{
      background: var(--card);
      border: 1px solid var(--stroke);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 18px 16px;
      backdrop-filter: blur(10px);
    }
    .tips{
      margin: 0 0 14px 0;
      color: var(--muted);
      font-size: 13px;
      display:flex;
      gap:10px;
      flex-wrap:wrap;
    }
    .tips code{
      background: rgba(31,42,68,.75);
      border: 1px solid rgba(35,48,77,.9);
      padding: 2px 6px;
      border-radius: 8px;
      color: var(--badgeText);
    }

    /* tree */
    .tree{
      list-style:none;
      margin:0;
      padding-left: 14px;
    }
    .node{
      margin: 6px 0;
    }
    details > summary{
      cursor:pointer;
      user-select:none;
      display:flex;
      align-items:center;
      gap:10px;
      padding: 8px 10px;
      border-radius: 12px;
      border: 1px solid transparent;
    }
    details > summary:hover{
      border-color: rgba(125,211,252,.22);
      background: rgba(125,211,252,.06);
    }
    details > summary::-webkit-details-marker{ display:none; }
    .icon{ width: 20px; text-align:center; }
    .name{ font-weight: 600; color: var(--text); }
    .hint{ color: var(--muted); font-weight: 500; }

    .fileLink{
      display:flex;
      align-items:center;
      gap:10px;
      padding: 8px 10px;
      border-radius: 12px;
      border: 1px solid transparent;
      text-decoration:none;
      color: var(--text);
    }
    .fileLink:hover{
      border-color: rgba(125,211,252,.22);
      background: rgba(125,211,252,.06);
    }
    .fileLink .name{
      font-weight: 560;
      color: var(--link);
    }
    .badge{
      margin-left:auto;
      font-size:11px;
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(31,42,68,.85);
      border: 1px solid rgba(35,48,77,.9);
      color: var(--badgeText);
      letter-spacing:.3px;
    }
    footer{
      margin-top: 14px;
      color: var(--muted);
      font-size: 12px;
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="title">
        <h1>Pages of Xiangbo</h1>
        <div class="sub">A simple index of files in this repo (auto-generated). Root <code>index.html</code> is hidden; subfolder <code>index.html</code> is listed.</div>
      </div>
      <div class="pill">Generated at ${now}</div>
    </header>

    <div class="card">
      <div class="tips">
        <span>Tip: click folders to collapse/expand.</span>
        <span>Tip: share a page like <code>/abc.html</code> or <code>/ai/</code>.</span>
      </div>
      ${body}
      <footer>© Xiangbo • Served by Cloudflare Pages</footer>
    </div>
  </div>
</body>
</html>
`;

fs.writeFileSync(OUTPUT_FILE, out, "utf8");
console.log(\`Generated \${OUTPUT_FILE}\`);
