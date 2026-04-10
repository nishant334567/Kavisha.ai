/**
 * Minimal Entrackr-style article scrape: fixed selectors only.
 */
const cheerio = require("cheerio");

const UA = "KavishaBlogScraper/1.0 (+https://kavisha.ai)";
const FETCH_MS = 45_000;

function absUrl(base, src) {
  if (!src || typeof src !== "string") return "";
  const s = src.trim();
  if (!s) return "";
  try {
    return new URL(s, base).href;
  } catch {
    return s;
  }
}

function stripNoiseText($, el) {
  return $(el)
    .clone()
    .find("script,style,noscript")
    .remove()
    .end()
    .text()
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {string} html
 * @param {string} pageUrl
 */
function parseArticleHtml(html, pageUrl) {
  const $ = cheerio.load(html);
  const root = $('[id^="article_div"]').length
    ? $('[id^="article_div"]').first()
    : $(".article_div").length
      ? $(".article_div").first()
      : $("body");

  /** Title sits in section.article-title > h1, often outside div.article_div */
  let title = "";
  const titleEls = [
    () => $("section.article-title h1.title_link").first(),
    () => $("h1.title_link.primary_font").first(),
    () => $(".title_link.primary_font").first(),
    () => root.find(".title_link.primary_font").first(),
    () => root.find(".title_link").first(),
  ];
  for (const pick of titleEls) {
    const el = pick();
    if (el.length) {
      title = el.text().replace(/\s+/g, " ").trim();
      if (title) break;
    }
  }
  if (!title) {
    const fromData =
      $(".article_main_div[data-heading-title]").attr("data-heading-title") ||
      $("[data-heading-title]").first().attr("data-heading-title");
    if (fromData) title = String(fromData).trim();
  }

  let author = "";
  const authorLink = $(".author a").first();
  if (authorLink.length) {
    author = authorLink.text().replace(/\s+/g, " ").trim();
  }
  if (!author) {
    const authorBox = $(".author").not(".author-img").first();
    if (authorBox.length) {
      author = authorBox
        .clone()
        .find("img, svg")
        .remove()
        .end()
        .text()
        .replace(/\s+/g, " ")
        .trim();
    }
  }
  if (!author) {
    root.find(".author-data").each((_, el) => {
      const t = $(el)
        .clone()
        .find("img, svg")
        .remove()
        .end()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      if (t && !author) author = t;
    });
  }

  /** Hero image lives in figure > .article-image > img.art-image — not .author-data avatars */
  let imageUrl = "";
  const heroCandidates = [
    () => $("figure .article-image img").first(),
    () => $(".article-image img").first(),
    () => $("img.art-image").first(),
    () => $("figure img").not(".author-data img").first(),
  ];
  for (const pick of heroCandidates) {
    const img = pick();
    if (img.length) {
      imageUrl = absUrl(pageUrl, img.attr("src") || img.attr("data-src") || "");
      if (imageUrl) break;
    }
  }

  const post =
    $("#post-container").length ? $("#post-container") : $("#postContent").length ? $("#postContent") : $(".article-data").first();
  const text = post.length ? stripNoiseText($, post[0]) : "";

  const timeEl = $("time.date").first();
  const date = (timeEl.attr("datetime") || timeEl.text() || "").replace(/\s+/g, " ").trim();

  return {
    url: pageUrl,
    title,
    author,
    imageUrl,
    text,
    date,
  };
}

async function scrapeEntrackrArticle(url) {
  const html = await fetchHtml(url);
  return parseArticleHtml(html, url);
}

module.exports = { scrapeEntrackrArticle, parseArticleHtml, fetchHtml };
