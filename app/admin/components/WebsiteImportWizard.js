"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import WebsiteLinksDialog from "@/app/admin/components/WebsiteLinksDialog";
import WebsiteScrapeJobBar from "@/app/admin/components/WebsiteScrapeJobBar";
import {
  discoverMetaFromScrapeJob,
  linksFromScrapeJob,
  readStoredWebsiteScrapeJobId,
  writeStoredWebsiteScrapeJobId,
} from "@/app/lib/websiteScrapeJobStorage";

export default function WebsiteImportWizard({
  brandSubdomain,
  folders = [],
  disabled,
  onTrainingChange,
  onComplete,
  onDocumentsRefresh,
}) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [error, setError] = useState(null);
  const [discovering, setDiscovering] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [discoverMeta, setDiscoverMeta] = useState(null);
  const [links, setLinks] = useState([]);
  const [scrapeJob, setScrapeJob] = useState(null);
  const [cardSaving, setCardSaving] = useState(false);
  const [cardSaveProgress, setCardSaveProgress] = useState(null);
  const [dialogSessionKey, setDialogSessionKey] = useState(0);

  const getPayload = async (res) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const applyJobToWizard = useCallback((job) => {
    if (!job) return;
    setScrapeJob(job);
    writeStoredWebsiteScrapeJobId(brandSubdomain, job.jobId);
    const meta = discoverMetaFromScrapeJob(job);
    const jobLinks = linksFromScrapeJob(job);
    if (meta) setDiscoverMeta(meta);
    if (jobLinks.length) setLinks(jobLinks);
  }, [brandSubdomain]);

  const deleteScrapeJobOnServer = useCallback(
    async (jobId) => {
      if (!jobId || !brandSubdomain) return true;
      try {
        const res = await fetch(
          `/api/admin/website-scrape-jobs?brand=${encodeURIComponent(brandSubdomain)}&jobId=${encodeURIComponent(jobId)}`,
          { method: "DELETE" }
        );
        return res.ok;
      } catch {
        return false;
      }
    },
    [brandSubdomain]
  );

  const dismissJob = useCallback(async () => {
    const jobId = scrapeJob?.jobId;
    if (jobId) {
      await deleteScrapeJobOnServer(jobId);
    }
    writeStoredWebsiteScrapeJobId(brandSubdomain, null);
    setScrapeJob(null);
    setCardSaving(false);
    setCardSaveProgress(null);
    setLinks([]);
    setDiscoverMeta(null);
    setDialogOpen(false);
    setDialogSessionKey((k) => k + 1);
    onTrainingChange?.(null);
  }, [brandSubdomain, scrapeJob?.jobId, deleteScrapeJobOnServer, onTrainingChange]);

  const pollJob = useCallback(async () => {
    if (!brandSubdomain || !scrapeJob?.jobId) return;
    try {
      const res = await fetch(
        `/api/admin/website-scrape-jobs?brand=${encodeURIComponent(brandSubdomain)}&jobId=${encodeURIComponent(scrapeJob.jobId)}`
      );
      const data = await getPayload(res);
      if (res.ok && data.job) {
        applyJobToWizard(data.job);
      }
    } catch {
      /* ignore poll errors */
    }
  }, [brandSubdomain, scrapeJob?.jobId, applyJobToWizard]);

  const loadActiveJob = useCallback(async () => {
    if (!brandSubdomain) return;
    try {
      const res = await fetch(
        `/api/admin/website-scrape-jobs?brand=${encodeURIComponent(brandSubdomain)}&active=true`
      );
      let data = await getPayload(res);
      if (res.ok && data.job) {
        applyJobToWizard(data.job);
        return;
      }

      const storedId = readStoredWebsiteScrapeJobId(brandSubdomain);
      if (storedId) {
        const res2 = await fetch(
          `/api/admin/website-scrape-jobs?brand=${encodeURIComponent(brandSubdomain)}&jobId=${encodeURIComponent(storedId)}`
        );
        data = await getPayload(res2);
        if (res2.ok && data.job) {
          applyJobToWizard(data.job);
        } else {
          writeStoredWebsiteScrapeJobId(brandSubdomain, null);
        }
      }
    } catch {
      /* ignore */
    }
  }, [brandSubdomain, applyJobToWizard]);

  useEffect(() => {
    loadActiveJob();
  }, [loadActiveJob]);

  const jobRunning =
    scrapeJob &&
    (scrapeJob.status === "pending" || scrapeJob.status === "running");

  const jobComplete = scrapeJob?.status === "completed";

  const showJobInCard =
    scrapeJob && (jobRunning || jobComplete || cardSaving);

  useEffect(() => {
    if (!scrapeJob?.jobId || !jobRunning) return;
    pollJob();
    const interval = setInterval(pollJob, 2000);
    return () => clearInterval(interval);
  }, [scrapeJob?.jobId, jobRunning, pollJob]);

  const handleDiscover = async () => {
    const trimmed = websiteUrl.trim();
    if (!trimmed || !brandSubdomain || disabled) return;

    setError(null);
    setDiscovering(true);
    onTrainingChange?.({ type: "website-discover", title: trimmed });

    const jobRunningNow =
      scrapeJob &&
      (scrapeJob.status === "pending" || scrapeJob.status === "running");

    try {
      if (scrapeJob?.jobId && !jobRunningNow) {
        await deleteScrapeJobOnServer(scrapeJob.jobId);
        writeStoredWebsiteScrapeJobId(brandSubdomain, null);
        setScrapeJob(null);
        setCardSaving(false);
        setCardSaveProgress(null);
      }

      const res = await fetch("/api/admin/discover-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, brand: brandSubdomain }),
      });
      const data = await getPayload(res);
      if (!res.ok) {
        throw new Error(data.error || "Could not find links on this site");
      }

      const found = data.links || [];
      if (!found.length) {
        throw new Error("No pages were found on this site");
      }

      setLinks(found);
      setDiscoverMeta({
        total: data.total ?? found.length,
        seedUrl: data.seedUrl || trimmed,
        postCount: data.postCount ?? 0,
        feedUrlCount: data.feedUrlCount ?? 0,
        folderId: data.folderId || "",
        folderName: data.folderName || "",
      });
      setDialogSessionKey((k) => k + 1);
      setDialogOpen(true);
    } catch (e) {
      setError(e?.message || "Discovery failed");
    } finally {
      setDiscovering(false);
      onTrainingChange?.(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    if (!jobRunning && !jobComplete && !cardSaving) {
      setLinks([]);
      setDiscoverMeta(null);
    }
  };

  const handleMinimize = () => {
    setDialogOpen(false);
  };

  const handleExpandJob = () => {
    if (scrapeJob && !links.length) {
      const jobLinks = linksFromScrapeJob(scrapeJob);
      if (jobLinks.length) setLinks(jobLinks);
      if (!discoverMeta) {
        const meta = discoverMetaFromScrapeJob(scrapeJob);
        if (meta) setDiscoverMeta(meta);
      }
    }
    setDialogOpen(true);
  };

  const handleImportComplete = async (result) => {
    await dismissJob();
    onComplete?.(result);
    setWebsiteUrl("");
  };

  const handleCardActivity = useCallback(
    ({ saving, saveProgress }) => {
      setCardSaving(Boolean(saving));
      setCardSaveProgress(saveProgress || null);
      if (saving) {
        onTrainingChange?.({
          type: "website-save",
          title: saveProgress?.label || "Website pages",
        });
      } else if (!jobRunning) {
        onTrainingChange?.(null);
      }
    },
    [jobRunning, onTrainingChange]
  );

  const busy = discovering || disabled;

  return (
    <>
      {showJobInCard ? (
        <WebsiteScrapeJobBar
          job={scrapeJob}
          saving={cardSaving}
          saveProgress={cardSaveProgress}
          onExpand={handleExpandJob}
          onDismiss={jobComplete && !cardSaving ? dismissJob : undefined}
        />
      ) : (
        <>
          <p className="mb-4 flex-1 text-sm text-muted">
            Find links on your site, scrape pages in the background, then save to
            your knowledge base.
          </p>
          <div className="mb-4">
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleDiscover();
                }
              }}
              placeholder="https://yourbrand.com"
              disabled={busy}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={handleDiscover}
            disabled={busy || !websiteUrl.trim()}
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-highlight transition-colors hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {discovering ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding links…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Find links
              </>
            )}
          </button>
        </>
      )}

      {error && !showJobInCard ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <WebsiteLinksDialog
        key={`website-links-${dialogSessionKey}`}
        open={dialogOpen}
        onClose={handleDialogClose}
        brandSubdomain={brandSubdomain}
        folders={folders}
        discoverMeta={discoverMeta}
        links={links}
        onFoldersRefresh={onDocumentsRefresh}
        onTrainingChange={onTrainingChange}
        onComplete={handleImportComplete}
        onDocumentsRefresh={onDocumentsRefresh}
        scrapeJob={scrapeJob}
        onScrapeJobChange={(job) => {
          if (job) applyJobToWizard(job);
          else {
            setScrapeJob(null);
            writeStoredWebsiteScrapeJobId(brandSubdomain, null);
          }
        }}
        onMinimize={handleMinimize}
        onCardActivity={handleCardActivity}
      />
    </>
  );
}
