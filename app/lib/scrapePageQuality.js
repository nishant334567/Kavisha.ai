/**
 * Scrape quality heuristics (keep nav/footer, require substantive inner pages too).
 */

export function countWords(text = "") {
  return String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function linkHeavyScore(text = "") {
  const lines = String(text)
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return 1;
  const shortLines = lines.filter(
    (l) => l.split(/\s+/).length <= 6 && l.length < 80
  ).length;
  return shortLines / lines.length;
}

export function isSubstantiveContent(content = "") {
  const text = String(content).trim();
  if (!text) return false;

  const mainSection = text.match(
    /## Main content\s*\n([\s\S]*?)(?=\n## |\s*$)/i
  );
  const body = (mainSection?.[1] || text).trim();
  const words = countWords(body);

  if (words < 120) return false;
  if (linkHeavyScore(body) > 0.72 && words < 250) return false;
  return true;
}

export function assessPagesForImport(pages = []) {
  const list = Array.isArray(pages) ? pages : [];
  const substantive = list.filter((p) =>
    isSubstantiveContent(p?.content || "")
  );

  return {
    ok: substantive.length > 0,
    substantiveCount: substantive.length,
    totalCount: list.length,
    message:
      substantive.length > 0
        ? null
        : "We found navigation/footer text but no substantive main content. The agent should visit more inner pages on this site.",
  };
}
