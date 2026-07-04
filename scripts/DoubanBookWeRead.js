/*
 * Douban Book WeRead search helper
 *
 * Adds a WeRead search button to Douban mobile book subject pages.
 *
 * Surge:
 * [Script]
 * DoubanBookWeRead = type=http-response,pattern=^https://m\.douban\.com/book/subject/\d+/?$,requires-body=1,max-size=0,script-path=https://raw.githubusercontent.com/joest67/surge-scripts/main/scripts/DoubanBookWeRead.js
 *
 * Quantumult X:
 * [rewrite_local]
 * ^https://m\.douban\.com/book/subject/\d+/?$ url script-response-body https://raw.githubusercontent.com/joest67/surge-scripts/main/scripts/DoubanBookWeRead.js
 *
 * MITM:
 * hostname = m.douban.com
 */

let body = typeof $response !== "undefined" ? $response.body : "";
let url = typeof $request !== "undefined" ? $request.url : "";

body = body.replace(/<a\s+class=["'][^"']*\bdb-weread-search\b[^"']*["'][\s\S]*?<\/a>/g, "");
body = body.replace(/<div\s+class=["']db-weread-title-wrap["']>\s*(<div[^>]+class=["'][^"']*\bsub-title\b[^"']*["'][^>]*>[^<]+<\/div>)\s*<\/div>/g, "$1");
body = body.replace(/<div\s+class=["']db-weread-panel["'][\s\S]*?<\/div>/g, "");
body = body.replace(/<section\s+class=["']db-weread-shelf["'][\s\S]*?<\/section>/g, "");
body = body.replace(/<a\s+class=["'][^"']*\btalion-nav-footer\b[^"']*["'][\s\S]*?<\/a>/g, "");
body = body.replace(/<style>[\s\S]*?\.db-weread-search[\s\S]*?<\/style>/g, "");
body = body.replace(/<style>[\s\S]*?\.db-weread-panel[\s\S]*?<\/style>/g, "");
body = body.replace(/<style>[\s\S]*?\.db-weread-shelf[\s\S]*?<\/style>/g, "");

const bookTitle = pick([
  /<div[^>]+class=["'][^"']*\bsub-title\b[^"']*["'][^>]*>\s*([^<]+?)\s*<\/div>/i,
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

main();

async function main() {
  if (!bookTitle) return $done({ body });

  const query = buildQuery(bookTitle, author, isbn);
  const searchUrl = buildSearchUrl(query);
  const searchData = await searchWeRead(query);
  const candidates = collectBookCandidates(searchData).slice(0, 8);
  const match = pickBestMatch(query, author, candidates);
  const shelf = buildShelf(searchUrl, match, candidates);

  body = replaceSubjectBanner(body, shelf);
  $done({ body });
}

function pick(patterns) {
  for (let i = 0; i < patterns.length; i++) {
    const match = body.match(patterns[i]);
    if (match && match[1]) return decodeHtml(match[1]).trim();
  }
  return "";
}

function buildQuery(title, authorName, isbnCode) {
  // Title works best for WeRead. ISBN is kept as a fallback when the title is absent.
  if (title) return cleanTitle(title);
  if (isbnCode) return isbnCode;
  return authorName || "";
}

function buildSearchUrl(query) {
  return "https://weread.qq.com/web/search/books?keyword=" + encodeURIComponent(query);
}

function buildReaderUrl(bookId) {
  return "https://weread.qq.com/web/reader/" + encodeURIComponent(encodeWeReadBookId(String(bookId)));
}

function buildShelf(searchUrl, match, candidates) {
  const books = candidates.slice(0, 6);
  const matchedTitle = match ? '<span class="db-weread-match-note">已匹配：' + escapeHtml(shortTitle(match.title)) + "</span>" : "";
  const cards = books.length
    ? books.map(function (book) { return buildBookCard(book); }).join("")
    : '<a class="db-weread-empty" href="' + escapeHtml(searchUrl) + '" target="_blank" rel="noopener noreferrer">未找到高相关结果，跳转搜索 &gt;</a>';

  return [
    '<section class="subject-section_rec db-weread-shelf" data-search-url="' + escapeHtml(searchUrl) + '">',
    '<div class="db-weread-shelf-head">',
    '<div class="db-weread-heading"><img class="db-weread-heading-icon" src="https://rescdn.qqmail.com/node/wr/wrpage/style/images/independent/favicon/favicon_32h.png" alt="微信读书">' + matchedTitle + "</div>",
    '<a class="db-weread-search-link" href="' + escapeHtml(searchUrl) + '" target="_blank" rel="noopener noreferrer">搜索更多 &gt;</a>',
    "</div>",
    '<ul class="section-rec_list db-weread-rec-list">',
    cards,
    "</ul>",
    '<script>(function(){var el=document.currentScript&&document.currentScript.previousElementSibling&&document.currentScript.previousElementSibling.parentNode;if(!el||!el.className||String(el.className).indexOf("db-weread-shelf")<0)return;var x=0,y=0;el.addEventListener("touchstart",function(e){var t=e.touches&&e.touches[0];if(!t)return;x=t.clientX;y=t.clientY;},{passive:true});el.addEventListener("touchend",function(e){var t=e.changedTouches&&e.changedTouches[0];if(!t)return;var dx=t.clientX-x,dy=t.clientY-y;if(dx<-70&&Math.abs(dy)<45){location.href=el.getAttribute("data-search-url");}}, {passive:true});})();</script>',
    buildAppAdCleanupScript(),
    "</section>",
  ].join("");
}

function buildAppAdCleanupScript() {
  return [
    "<script>",
    "(function(){",
    "function rm(){",
    "var nodes=document.querySelectorAll('.talion-nav-footer,a[href*=doubanapp][style*=fixed],a[href*=doubanapp][style*=bottom],.TalionNav a[href*=doubanapp],.TalionNav button,.TalionNav .open-app,.TalionNav [class*=open],.TalionNav [class*=download]');",
    "for(var i=0;i<nodes.length;i++){var t=(nodes[i].innerText||nodes[i].textContent||'');var h=nodes[i].getAttribute('href')||'';var s=nodes[i].getAttribute('style')||'';if(t.indexOf('打开App')>-1||t.indexOf('App内打开')>-1||h.indexOf('doubanapp')>-1||s.indexOf('bottom')>-1){nodes[i].style.display='none';nodes[i].style.visibility='hidden';}}",
    "}",
    "rm();setTimeout(rm,300);setTimeout(rm,1200);",
    "if(window.MutationObserver){new MutationObserver(rm).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});}",
    "})();",
    "</script>",
  ].join("");
}

function buildBookCard(book) {
  return [
    '<li class="rec-item">',
    '<a class="db-weread-book-link" href="' + escapeHtml(buildReaderUrl(book.bookId)) + '" target="_blank" rel="noopener noreferrer" title="' + escapeHtml(book.title) + '">',
    book.cover
      ? '<div class="rec-pic" style="background-image: url(' + escapeHtml(book.cover) + ')" alt="' + escapeHtml(book.title) + '"></div>'
      : '<div class="rec-pic db-weread-rec-pic-empty" alt="' + escapeHtml(book.title) + '">微</div>',
    '<div class="rec-name">' + escapeHtml(shortTitle(book.title)) + "</div>",
    "</a>",
    "</li>",
  ].join("");
}

async function searchWeRead(query) {
  try {
    return await requestJson("https://weread.qq.com/api/store/search?keyword=" + encodeURIComponent(query) + "&sid");
  } catch (e) {
    return null;
  }
}

function pickBestMatch(query, authorName, candidates) {
  let best = null;
  for (let i = 0; i < candidates.length; i++) {
    const score = matchScore(query, authorName, candidates[i]);
    if (!best || score > best.score) best = Object.assign({ score }, candidates[i]);
  }
  return best && best.score >= 85 ? best : null;
}

function requestJson(requestUrl) {
  return new Promise((resolve, reject) => {
    if (typeof $httpClient === "undefined") return reject(new Error("$httpClient unavailable"));

    $httpClient.get({
      url: requestUrl,
      headers: {
        "Accept": "application/json",
        "Referer": "https://weread.qq.com/",
        "User-Agent": "Mozilla/5.0",
      },
    }, function (error, response, data) {
      if (error) return reject(error);
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function collectBookCandidates(data) {
  const books = [];
  if (!data || !Array.isArray(data.results)) return books;

  for (let i = 0; i < data.results.length; i++) {
    const group = data.results[i];
    if (!Array.isArray(group.books)) continue;

    for (let j = 0; j < group.books.length; j++) {
      const info = group.books[j] && group.books[j].bookInfo;
      if (!info || !info.bookId || !info.title) continue;
      books.push({
        bookId: String(info.bookId),
        title: info.title || "",
        author: info.author || "",
        cover: info.cover || "",
        soldout: info.soldout,
        groupType: group.type,
      });
    }
  }

  return books;
}

function matchScore(query, authorName, book) {
  const queryTitle = normalizeTitle(query);
  const candidateTitle = normalizeTitle(book.title);
  const doubanAuthor = normalizePerson(authorName);
  const candidateAuthor = normalizePerson(book.author);
  let score = 0;

  if (candidateTitle === queryTitle) score += 90;
  else if (candidateTitle.indexOf(queryTitle) === 0) score += 82;
  else if (candidateTitle.indexOf(queryTitle) !== -1) score += 72;
  else if (queryTitle.indexOf(candidateTitle) !== -1) score += 65;
  else score += similarity(queryTitle, candidateTitle) * 70;

  if (doubanAuthor && candidateAuthor) {
    if (candidateAuthor.indexOf(doubanAuthor) !== -1 || doubanAuthor.indexOf(candidateAuthor) !== -1) score += 12;
    else score -= 8;
  }

  if (book.soldout) score -= 10;
  if (book.groupType === 1) score += 4;

  return score;
}

function replaceSubjectBanner(html, shelf) {
  const style = [
    "<style>",
    ".db-weread-shelf{margin:0;padding:15px;background:#f5f5f5;color:#222;overflow:hidden;}",
    ".db-weread-shelf-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:15px;}",
    ".db-weread-heading{display:flex;align-items:center;gap:7px;min-width:0;}",
    ".db-weread-heading-icon{display:block;width:18px;height:18px;border:0;flex:0 0 auto;}",
    ".db-weread-match-note{display:block;color:#2f9fcb;font-size:11px;font-weight:500;line-height:1.25;}",
    ".db-weread-search-link{flex:0 0 auto;color:#2f9fcb!important;font-size:13px;font-weight:600;line-height:1.2;text-decoration:none!important;}",
    ".db-weread-shelf .section-rec_list{display:flex;align-items:flex-start;justify-content:flex-start;gap:0;margin-left:-10px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;}",
    ".db-weread-shelf .section-rec_list::-webkit-scrollbar{display:none;}",
    ".db-weread-shelf .section-rec_list .rec-item{flex:0 0 78px;width:78px;margin-left:10px;text-align:center;scroll-snap-align:start;}",
    ".db-weread-book-link{display:block;color:inherit!important;text-decoration:none!important;}",
    ".db-weread-shelf .section-rec_list .rec-pic{border-radius:4px;background-size:103%;background-position:center;background-repeat:no-repeat;width:78px;height:110px;}",
    ".db-weread-shelf .section-rec_list .rec-name{display:block;font-size:11px;font-weight:500;color:#191919;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;margin-top:5px;}",
    ".db-weread-rec-pic-empty{display:flex!important;align-items:center;justify-content:center;background:#21a675!important;color:#fff;font-size:30px;font-weight:800;}",
    ".db-weread-empty{display:block;width:100%;padding:16px 0;color:#2f9fcb!important;font-size:13px;font-weight:600;text-decoration:none!important;}",
    ".talion-nav-footer,a.talion-nav-footer,a[href*='doubanapp'][style*='fixed'][style*='bottom']{display:none!important;visibility:hidden!important;pointer-events:none!important;}",
    ".TalionNav a[href*='doubanapp'],.TalionNav button,.TalionNav .open-app,.TalionNav [class*='open'],.TalionNav [class*='download']{display:none!important;visibility:hidden!important;pointer-events:none!important;}",
    "</style>",
  ].join("");

  const bannerPattern = /<div\s+class=["']subject-banner["'][\s\S]*?<\/div>\s*/i;
  if (bannerPattern.test(html)) {
    return html.replace("</head>", style + "</head>").replace(bannerPattern, shelf);
  }

  const introPattern = /(<section[^>]+class=["'][^"']*\bsubject-section_intro\b[^"']*["'][^>]*>)/i;
  if (introPattern.test(html)) {
    return html.replace("</head>", style + "</head>").replace(introPattern, shelf + "$1");
  }

  return html;
}

function cleanTitle(title) {
  return String(title)
    .replace(/\s*-\s*图书\s*$/i, "")
    .replace(/\s*-\s*豆瓣\s*$/i, "")
    .replace(/（[^）]*(修订|新版|典藏|纪念|精装|平装|插图|全译|增订|升级|珍藏|再版)[^）]*）/g, "")
    .replace(/\([^)]*(修订|新版|典藏|纪念|精装|平装|插图|全译|增订|升级|珍藏|再版)[^)]*\)/gi, "")
    .trim();
}

function shortTitle(title) {
  return cleanTitle(title).replace(/[：:].*$/g, "");
}

function normalizeTitle(title) {
  return cleanTitle(title)
    .replace(/[：:].*$/g, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[《》「」『』【】\[\]\s·,，.。:：;；!！?？'"“”‘’\-—_]/g, "")
    .toLowerCase();
}

function normalizePerson(name) {
  return String(name || "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/【[^】]+】/g, "")
    .replace(/[著编译绘校等]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const seen = {};
  let hit = 0;
  for (let i = 0; i < a.length; i++) seen[a[i]] = true;
  for (let j = 0; j < b.length; j++) if (seen[b[j]]) hit++;
  return hit / Math.max(a.length, b.length);
}

function encodeWeReadBookId(bookId) {
  const md5Value = md5(bookId);
  let result = md5Value.substr(0, 3);
  const encoded = encodeBookIdParts(bookId);
  result += encoded[0];
  result += 2 + md5Value.substr(md5Value.length - 2, 2);

  for (let i = 0; i < encoded[1].length; i++) {
    let len = encoded[1][i].length.toString(16);
    if (len.length === 1) len = "0" + len;
    result += len + encoded[1][i];
    if (i < encoded[1].length - 1) result += "g";
  }

  if (result.length < 20) result += md5Value.substr(0, 20 - result.length);
  result += md5(result).substr(0, 3);
  return result;
}

function encodeBookIdParts(bookId) {
  if (/^\d*$/.test(bookId)) {
    const parts = [];
    for (let i = 0; i < bookId.length; i += 9) {
      parts.push(parseInt(bookId.slice(i, Math.min(i + 9, bookId.length)), 10).toString(16));
    }
    return ["3", parts];
  }

  let hex = "";
  for (let i = 0; i < bookId.length; i++) hex += bookId.charCodeAt(i).toString(16);
  return ["4", [hex]];
}

function md5(input) {
  function rotateLeft(value, shift) {
    return (value << shift) | (value >>> (32 - shift));
  }

  function addUnsigned(x, y) {
    const x4 = x & 0x40000000;
    const y4 = y & 0x40000000;
    const x8 = x & 0x80000000;
    const y8 = y & 0x80000000;
    const result = (x & 0x3fffffff) + (y & 0x3fffffff);
    if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8;
    if (x4 | y4) return (result & 0x40000000) ? result ^ 0xc0000000 ^ x8 ^ y8 : result ^ 0x40000000 ^ x8 ^ y8;
    return result ^ x8 ^ y8;
  }

  function f(x, y, z) { return (x & y) | (~x & z); }
  function g(x, y, z) { return (x & z) | (y & ~z); }
  function h(x, y, z) { return x ^ y ^ z; }
  function i(x, y, z) { return y ^ (x | ~z); }
  function ff(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
  function gg(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
  function hh(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }
  function ii(a, b, c, d, x, s, ac) { a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac)); return addUnsigned(rotateLeft(a, s), b); }

  function utf8Encode(text) {
    return unescape(encodeURIComponent(text));
  }

  function convertToWordArray(text) {
    const length = text.length;
    const wordCount = (((length + 8) - ((length + 8) % 64)) / 64 + 1) * 16;
    const words = new Array(wordCount - 1);
    let bytePosition = 0;
    let byteCount = 0;
    while (byteCount < length) {
      bytePosition = (byteCount - (byteCount % 4)) / 4;
      words[bytePosition] = words[bytePosition] | (text.charCodeAt(byteCount) << ((byteCount % 4) * 8));
      byteCount++;
    }
    bytePosition = (byteCount - (byteCount % 4)) / 4;
    words[bytePosition] = words[bytePosition] | (0x80 << ((byteCount % 4) * 8));
    words[wordCount - 2] = length << 3;
    words[wordCount - 1] = length >>> 29;
    return words;
  }

  function wordToHex(value) {
    let output = "";
    for (let count = 0; count <= 3; count++) {
      const byte = (value >>> (count * 8)) & 255;
      output += ("0" + byte.toString(16)).slice(-2);
    }
    return output;
  }

  const x = convertToWordArray(utf8Encode(String(input)));
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let k = 0; k < x.length; k += 16) {
    const aa = a;
    const bb = b;
    const cc = c;
    const dd = d;

    a = ff(a, b, c, d, x[k + 0], 7, 0xd76aa478); d = ff(d, a, b, c, x[k + 1], 12, 0xe8c7b756); c = ff(c, d, a, b, x[k + 2], 17, 0x242070db); b = ff(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
    a = ff(a, b, c, d, x[k + 4], 7, 0xf57c0faf); d = ff(d, a, b, c, x[k + 5], 12, 0x4787c62a); c = ff(c, d, a, b, x[k + 6], 17, 0xa8304613); b = ff(b, c, d, a, x[k + 7], 22, 0xfd469501);
    a = ff(a, b, c, d, x[k + 8], 7, 0x698098d8); d = ff(d, a, b, c, x[k + 9], 12, 0x8b44f7af); c = ff(c, d, a, b, x[k + 10], 17, 0xffff5bb1); b = ff(b, c, d, a, x[k + 11], 22, 0x895cd7be);
    a = ff(a, b, c, d, x[k + 12], 7, 0x6b901122); d = ff(d, a, b, c, x[k + 13], 12, 0xfd987193); c = ff(c, d, a, b, x[k + 14], 17, 0xa679438e); b = ff(b, c, d, a, x[k + 15], 22, 0x49b40821);

    a = gg(a, b, c, d, x[k + 1], 5, 0xf61e2562); d = gg(d, a, b, c, x[k + 6], 9, 0xc040b340); c = gg(c, d, a, b, x[k + 11], 14, 0x265e5a51); b = gg(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
    a = gg(a, b, c, d, x[k + 5], 5, 0xd62f105d); d = gg(d, a, b, c, x[k + 10], 9, 0x02441453); c = gg(c, d, a, b, x[k + 15], 14, 0xd8a1e681); b = gg(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
    a = gg(a, b, c, d, x[k + 9], 5, 0x21e1cde6); d = gg(d, a, b, c, x[k + 14], 9, 0xc33707d6); c = gg(c, d, a, b, x[k + 3], 14, 0xf4d50d87); b = gg(b, c, d, a, x[k + 8], 20, 0x455a14ed);
    a = gg(a, b, c, d, x[k + 13], 5, 0xa9e3e905); d = gg(d, a, b, c, x[k + 2], 9, 0xfcefa3f8); c = gg(c, d, a, b, x[k + 7], 14, 0x676f02d9); b = gg(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);

    a = hh(a, b, c, d, x[k + 5], 4, 0xfffa3942); d = hh(d, a, b, c, x[k + 8], 11, 0x8771f681); c = hh(c, d, a, b, x[k + 11], 16, 0x6d9d6122); b = hh(b, c, d, a, x[k + 14], 23, 0xfde5380c);
    a = hh(a, b, c, d, x[k + 1], 4, 0xa4beea44); d = hh(d, a, b, c, x[k + 4], 11, 0x4bdecfa9); c = hh(c, d, a, b, x[k + 7], 16, 0xf6bb4b60); b = hh(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
    a = hh(a, b, c, d, x[k + 13], 4, 0x289b7ec6); d = hh(d, a, b, c, x[k + 0], 11, 0xeaa127fa); c = hh(c, d, a, b, x[k + 3], 16, 0xd4ef3085); b = hh(b, c, d, a, x[k + 6], 23, 0x04881d05);
    a = hh(a, b, c, d, x[k + 9], 4, 0xd9d4d039); d = hh(d, a, b, c, x[k + 12], 11, 0xe6db99e5); c = hh(c, d, a, b, x[k + 15], 16, 0x1fa27cf8); b = hh(b, c, d, a, x[k + 2], 23, 0xc4ac5665);

    a = ii(a, b, c, d, x[k + 0], 6, 0xf4292244); d = ii(d, a, b, c, x[k + 7], 10, 0x432aff97); c = ii(c, d, a, b, x[k + 14], 15, 0xab9423a7); b = ii(b, c, d, a, x[k + 5], 21, 0xfc93a039);
    a = ii(a, b, c, d, x[k + 12], 6, 0x655b59c3); d = ii(d, a, b, c, x[k + 3], 10, 0x8f0ccc92); c = ii(c, d, a, b, x[k + 10], 15, 0xffeff47d); b = ii(b, c, d, a, x[k + 1], 21, 0x85845dd1);
    a = ii(a, b, c, d, x[k + 8], 6, 0x6fa87e4f); d = ii(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0); c = ii(c, d, a, b, x[k + 6], 15, 0xa3014314); b = ii(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
    a = ii(a, b, c, d, x[k + 4], 6, 0xf7537e82); d = ii(d, a, b, c, x[k + 11], 10, 0xbd3af235); c = ii(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb); b = ii(b, c, d, a, x[k + 9], 21, 0xeb86d391);

    a = addUnsigned(a, aa);
    b = addUnsigned(b, bb);
    c = addUnsigned(c, cc);
    d = addUnsigned(d, dd);
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
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
