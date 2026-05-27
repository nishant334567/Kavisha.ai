"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import TextTrainingModal from "@/app/admin/components/TextTrainingModal";
import { normalizeWebsiteUrl } from "@/app/lib/websiteScrapeContent";

const BATCH_DELAY_MS = 1500;
/** One page at a time — avoids overlapping embedding API bursts. */
const SAVE_CONCURRENCY = 1;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function friendlyScrapeReason(message = "") {
  const m = String(message).toLowerCase();
  if (m.includes("timeout")) return "Page didn't load in time";
  if (m.includes("network") || m.includes("econnreset")) {
    return "Connection problem";
  }
  return message || "Could not load this page";
}

export default function WebsiteLinksDialog({
  open,
  onClose,
  brandSubdomain,
  folders = [],
  discoverMeta,
  links = [],
  onTrainingChange,
  onComplete,
  onDocumentsRefresh,
  onFoldersRefresh,
}) {
  const [pageStates, setPageStates] = useState({});
  const [websiteFolderId, setWebsiteFolderId] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [linkFilter, setLinkFilter] = useState("all");
  const [error, setError] = useState(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(null);
  const [viewPage, setViewPage] = useState(null);
  const [editFolderId, setEditFolderId] = useState("");
  const savedCanonicalKeys = useRef(new Set());
  const pageStatesRef = useRef(pageStates);
  pageStatesRef.current = pageStates;

  const postLinks = useMemo(
    () => links.filter((l) => l.category === "post"),
    [links]
  );

  const visibleLinks = useMemo(
    () => (linkFilter === "posts" ? postLinks : links),
    [linkFilter, postLinks, links]
  );

  useEffect(() => {
    if (!open || links.length === 0) return;
    const initial = {};
    for (const link of links) {
      initial[link.url] = {
        status: "idle",
        label: link.label,
        url: link.url,
        category: link.category,
      };
    }
    setPageStates(initial);
    setSelected(new Set(links.map((l) => l.url)));
    setLinkFilter("all");
    setError(null);
    setBatchRunning(false);
    setBatchProgress(null);
    setSaveProgress(null);
    savedCanonicalKeys.current = new Set();
    setWebsiteFolderId(discoverMeta?.folderId || "");
    if (discoverMeta?.folderId) {
      setEditFolderId(discoverMeta.folderId);
    }
  }, [open, links, discoverMeta?.folderId]);

  const getPayload = async (res) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const getState = (url) => pageStates[url] || { status: "idle", url };

  const unsavedScrapedUrls = useMemo(
    () =>
      Object.values(pageStates)
        .filter((p) => p.status === "scraped" && p.payload)
        .map((p) => p.url),
    [pageStates]
  );

  const idleUrls = useMemo(
    () =>
      Object.values(pageStates)
        .filter((p) => p.status === "idle" || p.status === "error")
        .map((p) => p.url),
    [pageStates]
  );

  const hasAnyScraped = useMemo(
    () =>
      Object.values(pageStates).some(
        (p) => p.status === "scraped" || p.status === "saved"
      ),
    [pageStates]
  );

  const checkboxHint = hasAnyScraped
    ? "When finished scraping, click Save all — nothing saves automatically"
    : "Checked pages will be scraped";

  const updatePage = useCallback((url, patch) => {
    setPageStates((prev) => ({
      ...prev,
      [url]: { ...prev[url], ...patch },
    }));
  }, []);

  const scrapeOne = async (url) => {
    updatePage(url, { status: "scraping", error: null });
    try {
      const st = pageStatesRef.current[url] || {};
      const res = await fetch("/api/admin/scrape-website-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brandSubdomain,
          url,
          label: st.label,
          seedUrl: discoverMeta?.seedUrl || "",
        }),
      });
      const data = await getPayload(res);
      if (!res.ok) {
        throw new Error(data.error || "Scrape failed");
      }
      const page = data.page;
      updatePage(url, {
        status: "scraped",
        payload: {
          title: page.title,
          content: page.content,
          sourceUrl: page.sourceUrl || page.url || url,
          prepared: true,
        },
        error: null,
      });
      return true;
    } catch (e) {
      updatePage(url, {
        status: "error",
        error: friendlyScrapeReason(e?.message),
      });
      return false;
    }
  };

  const savePages = useCallback(
    async (urlsToSave) => {
      const states = pageStatesRef.current;
      const pages = [];
      for (const url of urlsToSave) {
        const p = states[url];
        if (p?.status !== "scraped" || !p.payload) continue;
        const key = normalizeWebsiteUrl(p.payload.sourceUrl || p.url);
        if (key && savedCanonicalKeys.current.has(key)) continue;
        pages.push({
          url: p.url,
          label: p.label,
          title: p.payload.title,
          content: p.payload.content,
          sourceUrl: p.payload.sourceUrl,
          prepared: p.payload.prepared !== false,
        });
      }

      if (!pages.length) return null;

      setSaving(true);
      setSaveProgress({ done: 0, total: pages.length, label: "" });
      onTrainingChange?.({
        type: "website-save",
        title: `${pages.length} page${pages.length === 1 ? "" : "s"}`,
      });

      const folderId = websiteFolderId || editFolderId;
      const imported = [];
      const failed = [];
      const skipped = [];
      let substantiveCount = 0;

      const applyImportedRow = (row) => {
        imported.push(row);
        if (row.substantive) substantiveCount += 1;
        const pageUrl = row.url || row.sourceUrl;
        const key = normalizeWebsiteUrl(row.sourceUrl || pageUrl);
        if (key) savedCanonicalKeys.current.add(key);
        if (pageUrl) {
          updatePage(pageUrl, {
            status: "saved",
            docid: row.docid,
            saveError: null,
          });
        }
      };

      const markPageSaveFailed = (page, errorMsg) => {
        updatePage(page.url, {
          status: "scraped",
          saveError: errorMsg,
        });
      };

      const saveOnePage = async (page) => {
        const res = await fetch("/api/admin/save-website-pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brand: brandSubdomain,
            pages: [page],
            seedUrl: discoverMeta?.seedUrl || "",
            ...(folderId && { folderId }),
          }),
        });
        const data = await getPayload(res);

        for (const row of data.imported || []) applyImportedRow(row);
        for (const f of data.failed || []) {
          failed.push(f);
          markPageSaveFailed(page, f.error || "Save failed");
        }
        for (const s of data.skipped || []) skipped.push(s);

        if (!res.ok && !(data.imported || []).length) {
          const errMsg =
            data.error ||
            data.failed?.[0]?.error ||
            "Save failed";
          if (!data.failed?.length) {
            failed.push({
              sourceUrl: page.sourceUrl || page.url,
              url: page.url,
              error: errMsg,
            });
          }
          markPageSaveFailed(page, errMsg);
        }
      };

      try {
        let nextIndex = 0;
        let completedCount = 0;

        const workers = Array.from(
          { length: Math.min(SAVE_CONCURRENCY, pages.length) },
          async () => {
            while (true) {
              const i = nextIndex;
              nextIndex += 1;
              if (i >= pages.length) break;
              const page = pages[i];
              try {
                await saveOnePage(page);
              } catch (e) {
                failed.push({
                  sourceUrl: page.sourceUrl || page.url,
                  error: e?.message || "Save failed",
                });
              }
              completedCount += 1;
              setSaveProgress({
                done: completedCount,
                total: pages.length,
                label: page.label || page.url,
              });
            }
          }
        );

        await Promise.all(workers);

        onDocumentsRefresh?.();
        onFoldersRefresh?.();

        if (imported.length === 0) {
          throw new Error(
            failed[0]?.error ||
              "No pages could be saved to the knowledge base"
          );
        }

        let message = `Saved ${imported.length} page${imported.length === 1 ? "" : "s"} to your knowledge base`;
        if (failed.length) message += ` (${failed.length} failed)`;
        if (skipped.length) {
          message += ` (${skipped.length} duplicate${skipped.length === 1 ? "" : "s"} skipped)`;
        }

        const data = {
          success: true,
          message,
          imported,
          failed,
          skipped,
          scrapedCount: imported.length,
          substantiveCount,
          folderId,
        };

        if (failed.length) {
          const failDetail = failed
            .slice(0, 3)
            .map((f) => {
              const label =
                pageStatesRef.current[f.url || f.sourceUrl]?.label ||
                f.sourceUrl ||
                "page";
              return `${label}: ${f.error || "unknown"}`;
            })
            .join("; ");
          setError(
            `${message}. ${failDetail}${failed.length > 3 ? ` (+${failed.length - 3} more)` : ""}. Failed pages stay as Scraped — click Save all to retry.`
          );
        }

        setSaveProgress({ done: pages.length, total: pages.length, label: "" });
        return data;
      } finally {
        setSaving(false);
        setSaveProgress(null);
        onTrainingChange?.(null);
      }
    },
    [
      brandSubdomain,
      discoverMeta?.seedUrl,
      editFolderId,
      onDocumentsRefresh,
      onFoldersRefresh,
      onTrainingChange,
      updatePage,
      websiteFolderId,
    ]
  );

  const runScrapeBatch = async (urls) => {
    if (!urls.length || batchRunning) return;

    setError(null);
    setBatchRunning(true);
    onTrainingChange?.({
      type: "website-scrape",
      title: `${urls.length} pages`,
    });

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const label = pageStates[url]?.label || url;
      setBatchProgress({ done: i, total: urls.length, label });
      await scrapeOne(url);
      if (i < urls.length - 1) await delay(BATCH_DELAY_MS);
    }

    setBatchProgress({ done: urls.length, total: urls.length, label: "" });
    setBatchRunning(false);
    onTrainingChange?.(null);

    setTimeout(() => setBatchProgress(null), 300);
  };

  const handleScrapeRow = async (url) => {
    if (batchRunning || saving) return;
    setError(null);
    await scrapeOne(url);
  };

  const handleScrapeSelected = () => {
    const targets = [...selected].filter((u) => {
      const s = getState(u).status;
      return s === "idle" || s === "error";
    });
    runScrapeBatch(targets);
  };

  const handleScrapeAll = () => {
    runScrapeBatch([...idleUrls]);
  };

  const handleSaveSelected = async () => {
    const targets = [...selected].filter(
      (u) => getState(u).status === "scraped"
    );
    if (!targets.length) return;
    try {
      const data = await savePages(targets);
      if (data) {
        onComplete?.({
          title: discoverMeta?.seedUrl || "Website import",
          docid: `${data.imported?.length || 0} documents`,
          chunkCount: (data.imported || []).reduce(
            (s, r) => s + (r.chunkCount || 0),
            0
          ),
          message: data.message,
          failed: data.failed,
          scrapedCount: data.scrapedCount,
          substantiveCount: data.substantiveCount,
        });
      }
    } catch (e) {
      setError(e?.message || "Save failed");
    }
  };

  const handleSaveAll = async () => {
    if (!unsavedScrapedUrls.length) return;
    try {
      const data = await savePages(unsavedScrapedUrls);
      if (data) {
        onComplete?.({
          title: discoverMeta?.seedUrl || "Website import",
          docid: `${data.imported?.length || 0} documents`,
          chunkCount: (data.imported || []).reduce(
            (s, r) => s + (r.chunkCount || 0),
            0
          ),
          message: data.message,
          failed: data.failed,
          scrapedCount: data.scrapedCount,
          substantiveCount: data.substantiveCount,
        });
      }
    } catch (e) {
      setError(e?.message || "Save failed");
    }
  };

  const handleViewDoc = (url) => {
    const st = getState(url);
    if (st.status !== "scraped" && st.status !== "saved") return;
    const payload = st.payload;
    if (!payload && st.status !== "saved") return;

    if (st.status === "saved" && st.docid) {
      fetch(
        `/api/admin/training-documents?brand=${brandSubdomain}&docid=${st.docid}`
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.document) {
            setEditFolderId(
              data.document.folderId ? String(data.document.folderId) : ""
            );
            setViewPage({
              url,
              docid: st.docid,
              title: data.document.title,
              content: data.document.text,
              sourceUrl: data.document.sourceUrl || url,
            });
          }
        });
      return;
    }

    setEditFolderId(websiteFolderId || "");
    setViewPage({
      url,
      docid: st.docid || null,
      title: payload.title,
      content: payload.content,
      sourceUrl: payload.sourceUrl || url,
    });
  };

  const handleModalSave = async (updateData) => {
    if (!viewPage) return;

    setSaving(true);

    try {
      if (viewPage.docid) {
        const res = await fetch("/api/embeddings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docid: viewPage.docid,
            text: updateData.content,
            brand: brandSubdomain,
            title: updateData.title,
            folderId:
              (updateData.folderId ?? editFolderId) || websiteFolderId || null,
            ...(updateData.sourceUrl && { sourceUrl: updateData.sourceUrl }),
          }),
        });
        const data = await getPayload(res);
        if (!res.ok) throw new Error(data.error || "Update failed");
        updatePage(viewPage.url, {
          status: "saved",
          docid: viewPage.docid,
          payload: {
            title: updateData.title,
            content: updateData.content,
            sourceUrl: updateData.sourceUrl,
          },
        });
      } else {
        const res = await fetch("/api/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: updateData.content,
            brand: brandSubdomain,
            title: updateData.title,
            description: updateData.title,
            sourceUrl: updateData.sourceUrl || viewPage.url,
            folderId:
              (updateData.folderId ?? editFolderId) ||
              websiteFolderId ||
              null,
          }),
        });
        const data = await getPayload(res);
        if (!res.ok) throw new Error(data.error || "Save failed");
        const key = normalizeWebsiteUrl(
          updateData.sourceUrl || viewPage.url
        );
        if (key) savedCanonicalKeys.current.add(key);
        updatePage(viewPage.url, {
          status: "saved",
          docid: data.docid,
          payload: {
            title: updateData.title,
            content: updateData.content,
            sourceUrl: updateData.sourceUrl,
            prepared: true,
          },
        });
      }

      onDocumentsRefresh?.();
      onFoldersRefresh?.();
      setViewPage(null);
    } catch (e) {
      setError(e?.message || "Could not save document");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setViewPage(null);
    onClose();
  };

  const toggleUrl = (url) => {
    const st = getState(url);
    if (st.status === "saved") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const eligible = visibleLinks
      .map((l) => l.url)
      .filter((u) => {
        const s = getState(u).status;
        if (s === "saved") return false;
        if (hasAnyScraped) return s === "scraped" || s === "idle" || s === "error";
        return s === "idle" || s === "error";
      });
    const allSelected = eligible.every((u) => selected.has(u));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const u of eligible) next.delete(u);
      } else {
        for (const u of eligible) next.add(u);
      }
      return next;
    });
  };

  const busy = batchRunning || saving;
  const selectedScrapeCount = [...selected].filter((u) => {
    const s = getState(u).status;
    return s === "idle" || s === "error";
  }).length;
  const selectedSaveCount = [...selected].filter(
    (u) => getState(u).status === "scraped"
  ).length;

  const showSaveAll = unsavedScrapedUrls.length > 0 && !batchRunning;
  const batchPercent =
    batchProgress && batchProgress.total > 0
      ? Math.round((batchProgress.done / batchProgress.total) * 100)
      : 0;

  const savePercent =
    saveProgress && saveProgress.total > 0
      ? Math.round((saveProgress.done / saveProgress.total) * 100)
      : 0;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-highlight">Website pages</h2>
              {discoverMeta && (
                <p className="mt-1 text-sm text-muted">
                  Found{" "}
                  <span className="font-medium text-foreground">
                    {discoverMeta.total}
                  </span>{" "}
                  pages on{" "}
                  <span className="break-all text-foreground">
                    {discoverMeta.seedUrl}
                  </span>
                  {discoverMeta.folderName && (
                    <>
                      {" "}
                      · Folder:{" "}
                      <span className="font-medium text-foreground">
                        {discoverMeta.folderName}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={batchRunning}
              className="shrink-0 rounded-full p-2 text-muted transition-colors hover:bg-muted-bg hover:text-foreground disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-border px-6 py-2">
            <button
              type="button"
              onClick={() => setLinkFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${linkFilter === "all"
                  ? "bg-muted-bg text-foreground"
                  : "text-muted hover:bg-muted-bg"
                }`}
            >
              All ({links.length})
            </button>
            {postLinks.length > 0 && (
              <button
                type="button"
                onClick={() => setLinkFilter("posts")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${linkFilter === "posts"
                    ? "bg-highlight/15 text-highlight"
                    : "text-muted hover:bg-muted-bg"
                  }`}
              >
                Posts ({postLinks.length})
              </button>
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-2">
            <button
              type="button"
              onClick={toggleAllVisible}
              disabled={busy}
              className="text-xs font-medium text-highlight hover:underline disabled:opacity-50"
            >
              Select all
            </button>
            <span className="text-xs text-muted">{checkboxHint}</span>
          </div>

          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-2">
            {visibleLinks.map((link) => {
              const st = getState(link.url);
              const isSaved = st.status === "saved";
              const isScraped = st.status === "scraped";
              const isScraping = st.status === "scraping";
              const canCheck =
                !isSaved &&
                (st.status === "idle" ||
                  st.status === "error" ||
                  st.status === "scraped");

              return (
                <li
                  key={link.url}
                  className="flex items-start gap-3 rounded-xl border border-border bg-background px-3 py-3"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(link.url)}
                    onChange={() => toggleUrl(link.url)}
                    disabled={busy || !canCheck}
                    className="mt-1 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {link.label || link.url}
                    </p>
                    <p className="truncate text-xs text-muted">{link.url}</p>
                    {(st.error || st.saveError) && (
                      <p className="mt-1 text-xs text-red-600">
                        {st.saveError || st.error}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                    {isSaved ? (
                      <span className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                        Saved
                      </span>
                    ) : isScraped ? (
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                          st.saveError
                            ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                            : "bg-muted-bg text-muted"
                        }`}
                      >
                        {st.saveError ? "Save failed" : "Scraped"}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleScrapeRow(link.url)}
                        disabled={busy || isScraping}
                        className="rounded-lg bg-highlight px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {isScraping ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : st.status === "error" ? (
                          "Retry"
                        ) : (
                          "Scrape"
                        )}
                      </button>
                    )}
                    {(isScraped || isSaved) && (
                      <button
                        type="button"
                        onClick={() => handleViewDoc(link.url)}
                        disabled={busy}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted-bg disabled:opacity-50"
                      >
                        View doc
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {error && (
            <p className="mx-6 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="border-t border-border bg-muted-bg/30 px-6 py-4">
            {batchRunning && batchProgress && (
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>
                    Scraping {batchProgress.done} of {batchProgress.total}
                    {batchProgress.label
                      ? ` — ${batchProgress.label}`
                      : ""}
                  </span>
                  <span>{batchPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-highlight transition-all duration-300"
                    style={{ width: `${batchPercent}%` }}
                  />
                </div>
              </div>
            )}

            {saving && saveProgress && (
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span className="min-w-0 truncate pr-2">
                    Saving {saveProgress.done} of {saveProgress.total}
                    {saveProgress.label ? ` — ${saveProgress.label}` : ""}
                  </span>
                  <span className="shrink-0">{savePercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-green-600 transition-all duration-300"
                    style={{ width: `${savePercent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {showSaveAll ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveAll}
                      disabled={busy || saving}
                      className="rounded-lg bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {saving && saveProgress ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving {saveProgress.done}/{saveProgress.total}…
                        </span>
                      ) : saving ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving…
                        </span>
                      ) : (
                        `Save all (${unsavedScrapedUrls.length})`
                      )}
                    </button>
                    {selectedSaveCount > 0 && (
                      <button
                        type="button"
                        onClick={handleSaveSelected}
                        disabled={busy || saving}
                        className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-bg disabled:opacity-50"
                      >
                        Save selected ({selectedSaveCount})
                      </button>
                    )}
                    {selectedScrapeCount > 0 && (
                      <button
                        type="button"
                        onClick={handleScrapeSelected}
                        disabled={busy}
                        className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-bg disabled:opacity-50"
                      >
                        Scrape selected ({selectedScrapeCount})
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {selectedScrapeCount > 0 && (
                      <button
                        type="button"
                        onClick={handleScrapeSelected}
                        disabled={busy}
                        className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-bg disabled:opacity-50"
                      >
                        Scrape selected ({selectedScrapeCount})
                      </button>
                    )}
                    {idleUrls.length > 0 && (
                      <button
                        type="button"
                        onClick={handleScrapeAll}
                        disabled={busy}
                        className="rounded-lg bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                      >
                        Scrape all ({idleUrls.length})
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <TextTrainingModal
        isOpen={Boolean(viewPage)}
        onClose={() => setViewPage(null)}
        onSave={handleModalSave}
        initialTitle={viewPage?.title || ""}
        initialContent={viewPage?.content || ""}
        initialSourceUrl={viewPage?.sourceUrl || ""}
        isEditMode={true}
        isSaving={saving}
        folders={folders}
        folderId={editFolderId}
        onFolderChange={setEditFolderId}
      />
    </>
  );
}
