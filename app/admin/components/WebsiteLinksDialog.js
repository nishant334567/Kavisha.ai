"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, Minimize2, X } from "lucide-react";
import TextTrainingModal from "@/app/admin/components/TextTrainingModal";
import {
  friendlyScrapeReason,
  MAX_WEBSITE_BATCH_PAGES,
  websiteBatchLimitMessage,
} from "@/app/lib/websiteScrapeLimits";
import { websitePagesDialogTitle } from "@/app/lib/websiteImportMode";

function formatKbSavedHint() {
  return "Already saved";
}

function mapJobPageToUiStatus(p, existing = {}) {
  if (p.status === "trained") {
    return {
      status: "trained",
      docid: p.docid || p.payload?.docid || existing.docid,
      payload: p.payload || existing.payload,
      error: null,
    };
  }
  if (p.status === "training" || p.status === "scraping") {
    return { status: "training", error: null };
  }
  if (p.status === "error") {
    return { status: "error", error: p.error || "Training failed" };
  }
  if (p.status === "skipped") {
    return { status: "skipped", error: null };
  }
  if (p.status === "scraped" && p.payload?.docid) {
    return {
      status: "trained",
      docid: p.payload.docid,
      payload: p.payload,
      error: null,
    };
  }
  return { status: "idle", error: null };
}

export default function WebsiteLinksDialog({
  open,
  onClose,
  onMinimize,
  onResetLinks,
  brandSubdomain,
  folders = [],
  discoverMeta,
  links = [],
  onTrainingChange,
  onComplete,
  onDocumentsRefresh,
  onFoldersRefresh,
  scrapeJob = null,
  onScrapeJobChange,
  onCardActivity,
}) {
  const [pageStates, setPageStates] = useState({});
  const [websiteFolderId, setWebsiteFolderId] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [linkFilter, setLinkFilter] = useState("all");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [startingJob, setStartingJob] = useState(false);
  const [rowTrainingUrl, setRowTrainingUrl] = useState(null);
  const [viewPage, setViewPage] = useState(null);
  const [editFolderId, setEditFolderId] = useState("");
  const [selectionMenu, setSelectionMenu] = useState(null);
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

  const getPayload = async (res) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const getState = (url) => pageStates[url] || { status: "idle", url };

  const isUrlSelectable = useCallback((url) => {
    const s = pageStatesRef.current[url]?.status;
    return s === "idle" || s === "error" || s === "skipped";
  }, []);

  const isJobRunning =
    scrapeJob &&
    (scrapeJob.status === "pending" || scrapeJob.status === "running");

  const activeTrainingUrl = useMemo(() => {
    const busy = scrapeJob?.pages?.find(
      (p) => p.status === "training" || p.status === "scraping"
    );
    return busy?.url ?? null;
  }, [scrapeJob?.pages]);

  const isAnotherPageTraining = useCallback(
    (url) => Boolean(activeTrainingUrl && activeTrainingUrl !== url),
    [activeTrainingUrl]
  );

  const selectionLocked = isJobRunning || startingJob || Boolean(rowTrainingUrl);

  const jobUrlSet = useMemo(
    () => new Set((scrapeJob?.pages || []).map((p) => p.url)),
    [scrapeJob?.pages]
  );

  const loadKbHintsForLinks = useCallback(
    async (linkList) => {
      if (!brandSubdomain || !linkList.length) return;
      try {
        const res = await fetch("/api/admin/website-kb-urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brand: brandSubdomain,
            urls: linkList.map((l) => l.url),
          }),
        });
        const data = await getPayload(res);
        if (!res.ok || !data.savedByUrl) return;

        setPageStates((prev) => {
          const next = { ...prev };
          for (const [url, info] of Object.entries(data.savedByUrl)) {
            const row = next[url];
            if (!row || row.status !== "idle") continue;
            next[url] = {
              ...row,
              kbSaved: {
                docid: info.docid,
                title: info.title || "",
                savedAt: info.savedAt || null,
              },
            };
          }
          return next;
        });
      } catch {
        /* optional */
      }
    },
    [brandSubdomain]
  );

  useEffect(() => {
    if (!open || links.length === 0) return;

    if (scrapeJob?.pages?.length) {
      setWebsiteFolderId(discoverMeta?.folderId || scrapeJob.folderId || "");
      return;
    }

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
    setSelected(
      new Set(links.slice(0, MAX_WEBSITE_BATCH_PAGES).map((l) => l.url))
    );
    setLinkFilter("all");
    setError(null);
    setNotice(null);
    setWebsiteFolderId(discoverMeta?.folderId || "");
    if (discoverMeta?.folderId) setEditFolderId(discoverMeta.folderId);

    let cancelled = false;
    void loadKbHintsForLinks(links).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [
    open,
    links,
    discoverMeta?.folderId,
    scrapeJob?.jobId,
    scrapeJob?.pages?.length,
    loadKbHintsForLinks,
    scrapeJob?.folderId,
  ]);

  useEffect(() => {
    if (!scrapeJob?.pages?.length) return;
    setPageStates((prev) => {
      const next = { ...prev };
      for (const p of scrapeJob.pages) {
        const existing = next[p.url] || { url: p.url };
        const mapped = mapJobPageToUiStatus(p, existing);
        next[p.url] = {
          ...existing,
          url: p.url,
          label: p.label || existing.label,
          category: p.category ?? existing.category,
          ...mapped,
        };
      }
      return next;
    });
  }, [scrapeJob]);

  useEffect(() => {
    if (!scrapeJob?.pages?.length || selectionLocked) return;
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of scrapeJob.pages) {
        if (p.status === "skipped") next.delete(p.url);
        else if (p.status === "pending" || p.status === "idle") next.add(p.url);
      }
      return next;
    });
  }, [scrapeJob?.pages, selectionLocked]);

  useEffect(() => {
    if (!scrapeJob) return;
    if (isJobRunning) {
      onTrainingChange?.({
        type: "website-scrape",
        title: `${scrapeJob.trainedCount ?? 0}/${scrapeJob.totalCount || scrapeJob.pages?.length || 0} trained`,
      });
      onCardActivity?.({ saving: true });
    } else {
      onCardActivity?.({ saving: false });
      if (scrapeJob.status === "completed") {
        onTrainingChange?.(null);
      }
    }
  }, [scrapeJob, isJobRunning, onTrainingChange, onCardActivity]);

  const updatePage = useCallback((url, patch) => {
    setPageStates((prev) => ({
      ...prev,
      [url]: { ...prev[url], ...patch },
    }));
  }, []);

  const syncJobFromResponse = (job) => {
    if (job) onScrapeJobChange?.(job);
  };

  const updateJobSelection = useCallback(
    async (urls, included) => {
      if (!scrapeJob?.jobId || !brandSubdomain) return false;
      const inJob = urls.filter((u) => jobUrlSet.has(u));
      if (!inJob.length) return true;

      try {
        const res = await fetch("/api/admin/website-scrape-jobs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brand: brandSubdomain,
            jobId: scrapeJob.jobId,
            urls: inJob,
            included,
          }),
        });
        const data = await getPayload(res);
        if (!res.ok) throw new Error(data.error || "Failed to update selection");
        syncJobFromResponse(data.job);
        return true;
      } catch (e) {
        setError(e?.message || "Failed to update selection");
        return false;
      }
    },
    [brandSubdomain, jobUrlSet, onScrapeJobChange, scrapeJob?.jobId]
  );

  const stopTraining = useCallback(async () => {
    if (!scrapeJob?.jobId || !brandSubdomain) return;
    try {
      const res = await fetch("/api/admin/website-scrape-jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brandSubdomain,
          jobId: scrapeJob.jobId,
          stopTraining: true,
        }),
      });
      const data = await getPayload(res);
      if (!res.ok) throw new Error(data.error || "Failed to stop training");
      syncJobFromResponse(data.job);
      setNotice("Training stopped.");
      setError(null);
    } catch (e) {
      setError(e?.message || "Failed to stop training");
    }
  }, [brandSubdomain, scrapeJob?.jobId]);

  const trainOne = async (url) => {
    if (!scrapeJob?.jobId || selectionLocked) return;
    setRowTrainingUrl(url);
    setError(null);
    updatePage(url, { status: "training", error: null });

    try {
      const res = await fetch("/api/admin/train-website-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brandSubdomain,
          jobId: scrapeJob.jobId,
          url,
        }),
      });
      const data = await getPayload(res);
      syncJobFromResponse(data.job);

      if (data.page?.status === "trained") {
        updatePage(url, {
          status: "trained",
          docid: data.page.docid,
          error: null,
        });
        onDocumentsRefresh?.();
        setNotice("Page saved.");
      } else {
        updatePage(url, {
          status: "error",
          error: friendlyScrapeReason(data.page?.error || data.error),
        });
      }
    } catch (e) {
      updatePage(url, {
        status: "error",
        error: friendlyScrapeReason(e?.message),
      });
    } finally {
      setRowTrainingUrl(null);
    }
  };

  const trainableTargets = (urls) =>
    urls.filter((u) => {
      const s = getState(u).status;
      return s === "idle" || s === "error";
    });

  const handleTrainAll = async () => {
    if (!scrapeJob?.jobId) return;

    const selectedUrls = [...selected];
    const targets = trainableTargets(selectedUrls);
    if (!targets.length) {
      setError("Select at least one page to train");
      return;
    }

    if (selectedUrls.length > MAX_WEBSITE_BATCH_PAGES) {
      setError(websiteBatchLimitMessage());
      return;
    }

    if (targets.length === 1) {
      await trainOne(targets[0]);
      return;
    }

    if (selectionLocked) return;

    setStartingJob(true);
    setError(null);
    setNotice(null);

    try {
      const unchecked = links
        .map((l) => l.url)
        .filter((u) => selected.has(u) === false && jobUrlSet.has(u));
      if (unchecked.length) {
        await updateJobSelection(unchecked, false);
      }

      const res = await fetch("/api/admin/website-scrape-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brandSubdomain,
          startTraining: true,
          jobId: scrapeJob.jobId,
        }),
      });
      const data = await getPayload(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to start training");
      }
      syncJobFromResponse(data.job);
      setNotice("Training started — you can minimize this window.");
    } catch (e) {
      setError(e?.message || "Failed to start training");
    } finally {
      setStartingJob(false);
    }
  };

  const handleViewDoc = (url) => {
    const st = getState(url);
    if (st.status !== "trained" || !st.docid) return;

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
  };

  const handleModalSave = async (updateData) => {
    if (!viewPage?.docid) return;
    try {
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
      onDocumentsRefresh?.();
      onFoldersRefresh?.();
      setViewPage(null);
    } catch (e) {
      setError(e?.message || "Could not save document");
      throw e;
    }
  };

  const applySelection = useCallback(
    async (nextUrls) => {
      if (selectionLocked) return;
      const nextSet = new Set(nextUrls);
      setSelected(nextSet);

      if (!scrapeJob?.jobId) return;

      const toExclude = [...jobUrlSet].filter((u) => !nextSet.has(u));
      const toInclude = [...nextSet].filter((u) => jobUrlSet.has(u));
      if (toExclude.length) {
        await updateJobSelection(toExclude, false);
      }
      if (toInclude.length) {
        await updateJobSelection(toInclude, true);
      }
    },
    [selectionLocked, scrapeJob?.jobId, jobUrlSet, updateJobSelection]
  );

  const selectOnlyThis = useCallback(
    (url) => {
      if (!isUrlSelectable(url)) return;
      void applySelection([url]);
      setSelectionMenu(null);
    },
    [applySelection, isUrlSelectable]
  );

  const selectBlockFromHere = useCallback(
    (anchorUrl) => {
      const start = visibleLinks.findIndex((l) => l.url === anchorUrl);
      if (start === -1) return;

      const block = [];
      for (
        let i = start;
        i < visibleLinks.length && block.length < MAX_WEBSITE_BATCH_PAGES;
        i++
      ) {
        const u = visibleLinks[i].url;
        if (isUrlSelectable(u)) block.push(u);
      }
      if (!block.length) return;

      void applySelection(block);
      setSelectionMenu(null);
    },
    [visibleLinks, applySelection, isUrlSelectable]
  );

  const handleCheckboxContextMenu = (e, url, canCheck) => {
    if (!canCheck) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectionMenu({ x: e.clientX, y: e.clientY, url });
  };

  useEffect(() => {
    if (!selectionMenu) return;
    const close = () => setSelectionMenu(null);
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
    };
  }, [selectionMenu]);

  useEffect(() => {
    if (selectionLocked) setSelectionMenu(null);
  }, [selectionLocked]);

  const toggleUrl = (url) => {
    if (selectionLocked) return;
    const st = getState(url);
    if (st.status === "trained" || st.status === "training") return;

    const willInclude = !selected.has(url);
    setSelected((prev) => {
      const next = new Set(prev);
      if (willInclude) next.add(url);
      else next.delete(url);
      return next;
    });

    if (jobUrlSet.has(url) && scrapeJob?.jobId) {
      void updateJobSelection([url], willInclude);
    }
  };

  const toggleAllVisible = () => {
    if (selectionLocked) return;
    const eligible = visibleLinks
      .map((l) => l.url)
      .filter((u) => {
        const s = getState(u).status;
        return s === "idle" || s === "error" || s === "skipped";
      });
    const allSelected = eligible.every((u) => selected.has(u));
    const willInclude = !allSelected;

    setSelected((prev) => {
      const next = new Set(prev);
      if (willInclude) {
        for (const u of eligible) next.add(u);
      } else {
        for (const u of eligible) next.delete(u);
      }
      return next;
    });

    if (scrapeJob?.jobId && eligible.length) {
      void updateJobSelection(eligible, willInclude);
    }
  };

  const selectQueuedBatch = () => {
    if (selectionLocked) return;
    const queued = links
      .map((l) => l.url)
      .filter((u) => isUrlSelectable(u))
      .slice(0, MAX_WEBSITE_BATCH_PAGES);
    void applySelection(queued);
  };

  const trainedCount = useMemo(
    () => Object.values(pageStates).filter((p) => p.status === "trained").length,
    [pageStates]
  );

  const pendingTrainCount = useMemo(
    () =>
      [...selected].filter((u) => {
        const s = getState(u).status;
        return s === "idle" || s === "error";
      }).length,
    [selected, pageStates]
  );

  const batchProgress = isJobRunning
    ? {
        done: scrapeJob?.trainedCount ?? trainedCount,
        total: scrapeJob?.totalCount ?? links.length,
      }
    : null;
  const batchPercent =
    batchProgress && batchProgress.total > 0
      ? Math.round((batchProgress.done / batchProgress.total) * 100)
      : 0;

  const handleClose = () => {
    setViewPage(null);
    onClose();
  };

  if (!open) return null;

  const headerTitle = websitePagesDialogTitle(discoverMeta?.mode);

  const filterPill =
    "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200";
  const toolbarBtn =
    "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-50";

  return (
    <>
      <div className="website-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md">
        <div
          className="website-dialog-panel flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_24px_80px_-16px_rgba(45,84,94,0.35)]"
          role="dialog"
          aria-labelledby="website-links-title"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/60 bg-gradient-to-b from-muted-bg/40 to-card px-6 py-5">
            <div className="min-w-0 flex-1">
              <h2
                id="website-links-title"
                className="text-lg font-semibold text-highlight"
              >
                {headerTitle}
              </h2>
              {discoverMeta ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-highlight/10 px-2.5 py-0.5 text-xs font-medium text-highlight">
                    {discoverMeta.total} pages
                  </span>
                  {discoverMeta.folderName ? (
                    <span className="rounded-full bg-muted-bg px-2.5 py-0.5 text-xs text-muted">
                      {discoverMeta.folderName}
                    </span>
                  ) : null}
                  <span
                    className="max-w-full truncate text-xs text-muted"
                    title={discoverMeta.seedUrl}
                  >
                    {discoverMeta.seedUrl}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0">
              {isJobRunning || startingJob ? (
                <button
                  type="button"
                  onClick={onMinimize}
                  className="rounded-xl p-2 text-muted transition-all duration-200 hover:bg-muted-bg hover:text-foreground hover:shadow-sm"
                  aria-label="Minimize"
                  title="Minimize"
                >
                  <Minimize2 className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl p-2 text-muted transition-all duration-200 hover:bg-muted-bg hover:text-foreground hover:shadow-sm"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-6 py-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setLinkFilter("all")}
                className={`${filterPill} ${
                  linkFilter === "all"
                    ? "bg-highlight text-white shadow-sm"
                    : "bg-muted-bg text-muted hover:text-foreground"
                }`}
              >
                All {links.length}
              </button>
              {postLinks.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setLinkFilter("posts")}
                  className={`${filterPill} ${
                    linkFilter === "posts"
                      ? "bg-highlight text-white shadow-sm"
                      : "bg-muted-bg text-muted hover:text-foreground"
                  }`}
                >
                  Posts {postLinks.length}
                </button>
              ) : null}
            </div>
            <span className="text-xs text-muted">
              {selected.size} selected
              {selected.size > MAX_WEBSITE_BATCH_PAGES
                ? ` · max ${MAX_WEBSITE_BATCH_PAGES}/batch`
                : null}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-6 py-2.5">
            <button
              type="button"
              onClick={toggleAllVisible}
              disabled={selectionLocked}
              className={`${toolbarBtn} text-highlight hover:bg-highlight/10`}
            >
              Select all
            </button>
            {links.length > MAX_WEBSITE_BATCH_PAGES ? (
              <button
                type="button"
                onClick={selectQueuedBatch}
                disabled={selectionLocked}
                className={`${toolbarBtn} text-muted hover:bg-muted-bg hover:text-foreground`}
              >
                First {MAX_WEBSITE_BATCH_PAGES}
              </button>
            ) : null}
            {onResetLinks ? (
              <button
                type="button"
                onClick={onResetLinks}
                disabled={selectionLocked}
                className={`${toolbarBtn} ml-auto text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30`}
              >
                Reset
              </button>
            ) : null}
          </div>

          <ul className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-2">
            {visibleLinks.map((link) => {
              const st = getState(link.url);
              const isTrained = st.status === "trained";
              const isTraining =
                st.status === "training" || rowTrainingUrl === link.url;
              const isSkipped = st.status === "skipped";
              const kbHint =
                st.status === "idle" && st.kbSaved ? formatKbSavedHint() : null;
              const canCheck =
                !selectionLocked &&
                (st.status === "idle" ||
                  st.status === "error" ||
                  st.status === "skipped");
              const isSelected = selected.has(link.url);

              return (
                <li
                  key={link.url}
                  className={`website-link-row flex items-start gap-3 rounded-xl border px-3 py-3 ${
                    isSelected && canCheck
                      ? "border-highlight/35 bg-highlight/[0.04] shadow-sm ring-1 ring-highlight/15"
                      : "border-border/70 bg-background"
                  } ${isTraining ? "opacity-90" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleUrl(link.url)}
                    onContextMenu={(e) =>
                      handleCheckboxContextMenu(e, link.url, canCheck)
                    }
                    disabled={!canCheck}
                    className="mt-1 h-4 w-4 shrink-0 accent-highlight"
                    title={canCheck ? "Right-click for more options" : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                        {link.label || link.url}
                      </p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg p-1.5 text-muted transition-colors duration-200 hover:bg-muted-bg hover:text-foreground"
                        aria-label="Open page"
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">{link.url}</p>
                    {st.error ? (
                      <p className="mt-1 text-xs text-red-600">{st.error}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {kbHint ? (
                      <span
                        className="rounded-full bg-amber-100/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900 dark:bg-amber-900/35 dark:text-amber-200"
                        title={
                          st.kbSaved?.title ? st.kbSaved.title : undefined
                        }
                      >
                        {kbHint}
                      </span>
                    ) : null}
                    {isTrained ? (
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          Done
                        </span>
                        <button
                          type="button"
                          onClick={() => handleViewDoc(link.url)}
                          className="rounded-lg border border-border/80 px-2.5 py-1 text-xs font-medium text-foreground transition-colors duration-200 hover:bg-muted-bg"
                        >
                          View
                        </button>
                      </div>
                    ) : isSkipped ? (
                      <span className="rounded-full bg-muted-bg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                        Off
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => trainOne(link.url)}
                        disabled={
                          startingJob ||
                          isTraining ||
                          isAnotherPageTraining(link.url)
                        }
                        className="rounded-lg bg-highlight px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:bg-highlight/90 hover:shadow disabled:opacity-50"
                      >
                        {isTraining ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : st.status === "error" ? (
                          "Retry"
                        ) : (
                          "Train"
                        )}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {(notice || error) && (
            <div className="space-y-2 px-6 pb-2">
              {notice ? (
                <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-800 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {notice}
                </p>
              ) : null}
              {error ? (
                <p
                  className="rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2 text-sm text-red-700 shadow-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
            </div>
          )}

          <div className="border-t border-border/60 bg-card/95 px-6 py-4 shadow-[0_-12px_32px_-12px_rgba(45,84,94,0.12)] backdrop-blur-sm">
            {isJobRunning && batchProgress ? (
              <div className="mb-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted">
                  <span>
                    {batchProgress.done} / {batchProgress.total}
                  </span>
                  <span className="font-medium text-highlight">
                    {batchPercent}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-border/80">
                  <div
                    className="website-progress-bar h-full rounded-full bg-gradient-to-r from-highlight/75 to-highlight"
                    style={{ width: `${batchPercent}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTrainAll}
                disabled={
                  pendingTrainCount === 0 ||
                  !scrapeJob?.jobId ||
                  startingJob ||
                  (pendingTrainCount > 1 &&
                    (isJobRunning || Boolean(rowTrainingUrl)))
                }
                className="rounded-xl bg-highlight px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-highlight/90 hover:shadow-lg active:scale-[0.99] disabled:opacity-50"
              >
                {startingJob ||
                (pendingTrainCount > 1 && isJobRunning) ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isJobRunning ? "Training…" : "Starting…"}
                  </span>
                ) : (
                  `Train ${pendingTrainCount} page${pendingTrainCount === 1 ? "" : "s"}`
                )}
              </button>

              {isJobRunning ? (
                <button
                  type="button"
                  onClick={stopTraining}
                  className="rounded-xl border border-border/80 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted-bg"
                >
                  Stop
                </button>
              ) : null}

              {scrapeJob?.status === "completed" && trainedCount > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    onComplete?.({
                      title: discoverMeta?.seedUrl || "Website import",
                      message: `${trainedCount} page${trainedCount === 1 ? "" : "s"} trained`,
                    })
                  }
                  className="rounded-xl border border-border/80 px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted-bg"
                >
                  Done
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {selectionMenu ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] cursor-default border-0 bg-transparent p-0"
            aria-label="Close selection menu"
            onClick={() => setSelectionMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setSelectionMenu(null);
            }}
          />
          <div
            role="menu"
            className="fixed z-[61] min-w-[14rem] overflow-hidden rounded-xl border border-border/80 bg-card py-1 shadow-[0_12px_40px_-8px_rgba(45,84,94,0.25)]"
            style={{ left: selectionMenu.x, top: selectionMenu.y }}
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3.5 py-2.5 text-left text-sm text-foreground transition-colors duration-150 hover:bg-muted-bg"
              onClick={() => selectOnlyThis(selectionMenu.url)}
            >
              Select only this
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3.5 py-2.5 text-left text-sm text-foreground transition-colors duration-150 hover:bg-muted-bg"
              onClick={() => selectBlockFromHere(selectionMenu.url)}
            >
              Next {MAX_WEBSITE_BATCH_PAGES} from here
            </button>
          </div>
        </>
      ) : null}

      <TextTrainingModal
        isOpen={Boolean(viewPage)}
        onClose={() => setViewPage(null)}
        onSave={handleModalSave}
        initialTitle={viewPage?.title || ""}
        initialContent={viewPage?.content || ""}
        initialSourceUrl={viewPage?.sourceUrl || ""}
        isEditMode={true}
        folders={folders}
        folderId={editFolderId}
        onFolderChange={setEditFolderId}
      />
    </>
  );
}
