/*
 * Douban Book WeRead search helper
 *
 * Adds a WeRead search button to Douban mobile book subject pages.
 *
 * Surge:
 * [Script]
 * DoubanBookWeRead = type=http-response,pattern=^https://m\.douban\.com/book/subject/\d+/?$,requires-body=1,max-size=0,script-path=https://example.com/DoubanBookWeRead.js
 *
 * Quantumult X:
 * [rewrite_local]
 * ^https://m\.douban\.com/book/subject/\d+/?$ url script-response-body https://example.com/DoubanBookWeRead.js
 *
 * MITM:
 * hostname = m.douban.com
 */

let body = typeof $response !== "undefined" ? $response.body : "";
let url = typeof $request !== "undefined" ? $request.url : "";

const bookTitle = pick([
  /<span[^>]+property=["']v:itemreviewed["'][^>]*>\s*([^<]+?)\s*<\/span>/i,
  /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
  /<title>\s*([^<(]+?)\s*(?:\(豆瓣\))?\s*<\/title>/i,
]);

const author = pick([
  /<meta\s+property=["']book:author["']\s+content=["']([^"']+)["']/i,
  /<span[^>]*class=["']pl["'][^>]*>\s*作者\s*<\/span>\s*:\s*<a[^>]*>\s*([^<]+?)\s*<\/a>/i,
]);

const isbn = pick([
  /<meta\s+property=["']book:isbn["']\s+content=["']([^"']+)["']/i,
  /<span[^>]*class=["']pl["'][^>]*>\s*ISBN:\s*<\/span>\s*([0-9Xx-]+)/i,
]);

if (bookTitle && body.indexOf("db-weread-search") === -1) {
  const query = buildQuery(bookTitle, author, isbn);
  const wereadUrl = "https://weread.qq.com/web/search/books?keyword=" + encodeURIComponent(query);
  const button = buildButton(wereadUrl);

  body = insertButton(body, button);
}

$done({ body });

function pick(patterns) {
  for (let i = 0; i < patterns.length; i++) {
    const match = body.match(patterns[i]);
    if (match && match[1]) return decodeHtml(match[1]).trim();
  }
  return "";
}

function buildQuery(title, authorName, isbnCode) {
  // Title works best for WeRead. ISBN is kept as a fallback when the title is absent.
  if (title) return title;
  if (isbnCode) return isbnCode;
  return authorName || "";
}

function buildButton(targetUrl) {
  return [
    '<a class="db-weread-search" href="' + escapeHtml(targetUrl) + '" target="_blank" rel="noopener noreferrer">',
    '<span class="db-weread-icon">微</span>',
    '<span>微信读书</span>',
    "</a>",
  ].join("");
}

function insertButton(html, button) {
  const style = [
    "<style>",
    ".db-weread-search{display:inline-flex;align-items:center;gap:5px;margin-left:8px;padding:3px 8px;border:1px solid #21a675;border-radius:4px;color:#21a675!important;font-size:13px;font-weight:400;line-height:1.4;text-decoration:none!important;vertical-align:middle;background:#fff;}",
    ".db-weread-search:visited{color:#21a675!important;}",
    ".db-weread-icon{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:3px;background:#21a675;color:#fff;font-size:12px;line-height:16px;}",
    "</style>",
  ].join("");

  const h1SpanPattern = /(<h1[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>\s*<span[^>]+property=["']v:itemreviewed["'][^>]*>[^<]+<\/span>)/i;
  if (h1SpanPattern.test(html)) {
    return html.replace("</head>", style + "</head>").replace(h1SpanPattern, "$1" + button);
  }

  const ogTitlePattern = /(<meta\s+property=["']og:title["']\s+content=["'][^"']+["']\s*\/?>)/i;
  if (ogTitlePattern.test(html)) {
    return html.replace("</head>", style + "</head>").replace(ogTitlePattern, "$1" + button);
  }

  return html;
}

function decodeHtml(text) {
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
