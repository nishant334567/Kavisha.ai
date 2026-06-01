"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Loader2, Search } from "lucide-react";
import WebsiteLinksDialog from "@/app/admin/components/WebsiteLinksDialog";
import WebsiteScrapeJobBar from "@/app/admin/components/WebsiteScrapeJobBar";
import {
  discoverMetaFromScrapeJob,
  linksFromScrapeJob,
  readStoredWebsiteScrapeJobId,
  readStoredWebsiteScrapeJobMode,
  writeStoredWebsiteScrapeJobId,
  writeStoredWebsiteScrapeJobMode,
} from "@/app/lib/websiteScrapeJobStorage";
import {
  normalizeWebsiteImportMode,
  websiteImportModeLabel,
} from "@/app/lib/websiteImportMode";

const CARD_CONFIG = {
  generic: { placeholder: "https://yourbrand.com" },
  blog: { placeholder: "https://yourbrand.com/blog/" },
  ecommerce: {
    placeholder: "https://yourstore.com",
    hint: "Product pages are cleaned with JSON-LD and catalog-focused stripping before training.",
  },
};

const WebsiteImportContext = createContext(null);

export function useWebsiteImport() {
  const ctx = useContext(WebsiteImportContext);
  if (!ctx) {
    throw new Error("useWebsiteImport must be used within WebsiteImportProvider");
  }
  return ctx;
}

export function WebsiteImportProvider({
  brandSubdomain,
  folders = [],
  disabled,
  onTrainingChange,
  onComplete,
  onDocumentsRefresh,
  children,
}) {
  const [urlByMode, setUrlByMode] = useState({
    generic: "",
    blog: "",
    ecommerce: "",
  });
  const [errorByMode, setErrorByMode] = useState({
    generic: null,
    blog: null,
    ecommerce: null,
  });
  const [activeMode, setActiveMode] = useState(null);
  const [discovering, setDiscovering] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [discoverMeta, setDiscoverMeta] = useState(null);
  const [links, setLinks] = useState([]);
  const [scrapeJob, setScrapeJob] = useState(null);
  const [cardSaving, setCardSaving] = useState(false);
  const [dialogSessionKey, setDialogSessionKey] = useState(0);

  const getPayload = async (res) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const applyJobToWizard = useCallback(
    (job) => {
      if (!job) return;
      setScrapeJob(job);
      writeStoredWebsiteScrapeJobId(brandSubdomain, job.jobId);
      if (job.mode) {
        setActiveMode(job.mode);
        writeStoredWebsiteScrapeJobMode(brandSubdomain, job.mode);
      }
      const meta = discoverMetaFromScrapeJob(job);
      const jobLinks = linksFromScrapeJob(job);
      if (meta) setDiscoverMeta(meta);
      if (jobLinks.length) setLinks(jobLinks);
    },
    [brandSubdomain]
  );

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
    writeStoredWebsiteScrapeJobMode(brandSubdomain, null);
    setScrapeJob(null);
    setActiveMode(null);
    setCardSaving(false);
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

  const loadActiveJob = useCallback(
    async (mode) => {
      if (!brandSubdomain) return;
      const storedMode = readStoredWebsiteScrapeJobMode(brandSubdomain);
      if (storedMode) setActiveMode(storedMode);

      const modeParam = normalizeWebsiteImportMode(mode || storedMode);

      try {
        const res = await fetch(
          `/api/admin/website-scrape-jobs?brand=${encodeURIComponent(brandSubdomain)}&active=true&mode=${encodeURIComponent(modeParam)}`
        );
        let data = await getPayload(res);
        if (res.ok && data.job) {
          applyJobToWizard(data.job);
          if (data.job.mode) setActiveMode(data.job.mode);
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
            if (data.job.mode) setActiveMode(data.job.mode);
          } else {
            writeStoredWebsiteScrapeJobId(brandSubdomain, null);
            writeStoredWebsiteScrapeJobMode(brandSubdomain, null);
            setActiveMode(null);
          }
        }
      } catch {
        /* ignore */
      }
    },
    [brandSubdomain, applyJobToWizard]
  );

  useEffect(() => {
    loadActiveJob();
  }, [loadActiveJob]);

  const jobRunning =
    scrapeJob &&
    (scrapeJob.status === "pending" || scrapeJob.status === "running");

  const hasLinkSession =
    Boolean(scrapeJob?.pages?.length) &&
    ["discovered", "stopped", "pending", "running", "completed"].includes(
      scrapeJob?.status
    );

  const importInProgress = hasLinkSession;

  useEffect(() => {
    if (!scrapeJob?.jobId || !jobRunning) return;
    pollJob();
    const interval = setInterval(pollJob, 2000);
    return () => clearInterval(interval);
  }, [scrapeJob?.jobId, jobRunning, pollJob]);

  const handleDiscover = async (mode) => {
    const trimmed = (urlByMode[mode] || "").trim();
    if (!trimmed || !brandSubdomain || disabled) return;

    if (hasLinkSession && activeMode === mode) {
      setErrorByMode((prev) => ({
        ...prev,
        [mode]: "Reset links before discovering a new URL.",
      }));
      setDialogOpen(true);
      return;
    }

    if (jobRunning) return;

    setErrorByMode((prev) => ({ ...prev, [mode]: null }));
    setDiscovering(true);
    setActiveMode(mode);
    writeStoredWebsiteScrapeJobMode(brandSubdomain, mode);
    onTrainingChange?.({ type: "website-discover", title: trimmed });

    try {
      const res = await fetch("/api/admin/discover-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          brand: brandSubdomain,
          mode: normalizeWebsiteImportMode(mode),
        }),
      });
      const data = await getPayload(res);
      if (!res.ok) {
        throw new Error(data.error || "Could not find links on this site");
      }

      const found = data.links || [];
      if (!found.length) {
        throw new Error("No pages were found on this site");
      }

      const importMode = normalizeWebsiteImportMode(data.mode || mode);
      setLinks(found);
      setDiscoverMeta({
        total: data.total ?? found.length,
        seedUrl: data.seedUrl || trimmed,
        postCount: data.postCount ?? 0,
        feedUrlCount: data.feedUrlCount ?? 0,
        folderId: data.folderId || "",
        folderName: data.folderName || "",
        mode: importMode,
      });

      const sessionRes = await fetch("/api/admin/website-scrape-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brandSubdomain,
          discoverOnly: true,
          mode: importMode,
          pages: found,
          seedUrl: data.seedUrl || trimmed,
          folderId: data.folderId || "",
          folderName: data.folderName || "",
        }),
      });
      const sessionData = await getPayload(sessionRes);
      if (!sessionRes.ok) {
        throw new Error(
          sessionData.error ||
            sessionData.details?.message ||
            "Could not save link session"
        );
      }
      if (sessionData.job) {
        applyJobToWizard(sessionData.job);
      }

      setDialogSessionKey((k) => k + 1);
      setDialogOpen(true);
    } catch (e) {
      setErrorByMode((prev) => ({
        ...prev,
        [mode]: e?.message || "Discovery failed",
      }));
    } finally {
      setDiscovering(false);
      onTrainingChange?.(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleResetLinks = useCallback(async () => {
    await dismissJob();
    setUrlByMode((prev) => ({
      ...prev,
      ...(activeMode ? { [activeMode]: prev[activeMode] } : {}),
    }));
  }, [dismissJob, activeMode]);

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
    const completedMode = activeMode;
    await dismissJob();
    onComplete?.(result);
    if (completedMode) {
      setUrlByMode((prev) => ({ ...prev, [completedMode]: "" }));
    }
  };

  const handleCardActivity = useCallback(
    ({ saving }) => {
      setCardSaving(Boolean(saving));
    },
    []
  );

  const setUrlForMode = useCallback((mode, value) => {
    setUrlByMode((prev) => ({ ...prev, [mode]: value }));
  }, []);

  const contextValue = {
    urlByMode,
    setUrlForMode,
    errorByMode,
    discovering,
    disabled,
    activeMode,
    importInProgress,
    scrapeJob,
    jobRunning,
    hasLinkSession,
    cardSaving,
    handleDiscover,
    handleExpandJob,
  };

  return (
    <WebsiteImportContext.Provider value={contextValue}>
      {children}
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
        onResetLinks={handleResetLinks}
        onCardActivity={handleCardActivity}
      />
    </WebsiteImportContext.Provider>
  );
}

export function WebsiteImportPanel({ mode }) {
  const config = CARD_CONFIG[mode] || CARD_CONFIG.generic;
  const {
    urlByMode,
    setUrlForMode,
    errorByMode,
    discovering,
    disabled,
    activeMode,
    importInProgress,
    scrapeJob,
    jobRunning,
    hasLinkSession,
    cardSaving,
    handleDiscover,
    handleExpandJob,
  } = useWebsiteImport();

  const isOwnerCard =
    !importInProgress ||
    (activeMode ? activeMode === mode : mode === "generic");
  const showJobInCard = isOwnerCard && hasLinkSession;

  const busy = discovering || disabled;
  const blockedByOtherImport = importInProgress && !isOwnerCard;
  const error = errorByMode[mode];
  const websiteUrl = urlByMode[mode] || "";

  if (showJobInCard) {
    return (
      <WebsiteScrapeJobBar
        job={scrapeJob}
        saving={jobRunning || cardSaving}
        onExpand={handleExpandJob}
      />
    );
  }

  return (
    <div className="flex flex-col">
      {blockedByOtherImport ? (
        <p className="mb-5 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          Import running on {websiteImportModeLabel(activeMode)} — switch
          source to continue.
        </p>
      ) : null}

      <div className="mb-5 flex items-center gap-2 text-xs text-muted">
        {["URL", "Select", "Train"].map((step, i) => (
          <span key={step} className="flex items-center gap-2">
            {i > 0 ? (
              <span className="h-px w-4 bg-border" aria-hidden />
            ) : null}
            <span
              className={`rounded-full px-2.5 py-1 transition-colors duration-200 ${
                i === 0
                  ? "bg-highlight/10 font-medium text-highlight"
                  : "bg-muted-bg/80"
              }`}
            >
              {i + 1}. {step}
            </span>
          </span>
        ))}
      </div>

      <div className="website-scrape-card mb-5 rounded-2xl border border-border/70 bg-muted-bg/20 p-1">
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setUrlForMode(mode, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleDiscover(mode);
            }
          }}
          placeholder={config.placeholder}
          disabled={busy || blockedByOtherImport}
          aria-label={`${websiteImportModeLabel(mode)} store URL`}
          className="w-full rounded-xl border-0 bg-card px-4 py-3.5 text-sm text-foreground shadow-sm transition-all duration-200 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-highlight/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {config.hint ? (
        <p className="mb-5 text-sm leading-relaxed text-muted">{config.hint}</p>
      ) : null}

      <button
        type="button"
        onClick={() => handleDiscover(mode)}
        disabled={busy || blockedByOtherImport || !websiteUrl.trim()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-highlight px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-highlight/90 hover:shadow-lg active:scale-[0.99] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {discovering && activeMode === mode ? (
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

      {error ? (
        <p
          className="mt-4 rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default WebsiteImportProvider;
