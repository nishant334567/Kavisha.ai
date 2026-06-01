export function websiteScrapeJobStorageKey(brand) {
  return `kavisha-website-scrape-job-${brand || ""}`;
}

export function websiteScrapeJobModeStorageKey(brand) {
  return `kavisha-website-scrape-job-mode-${brand || ""}`;
}

export function readStoredWebsiteScrapeJobId(brand) {
  if (typeof window === "undefined" || !brand) return null;
  try {
    return sessionStorage.getItem(websiteScrapeJobStorageKey(brand));
  } catch {
    return null;
  }
}

export function writeStoredWebsiteScrapeJobId(brand, jobId) {
  if (typeof window === "undefined" || !brand) return;
  try {
    if (jobId) {
      sessionStorage.setItem(websiteScrapeJobStorageKey(brand), jobId);
    } else {
      sessionStorage.removeItem(websiteScrapeJobStorageKey(brand));
    }
  } catch {
    /* ignore */
  }
}

export function readStoredWebsiteScrapeJobMode(brand) {
  if (typeof window === "undefined" || !brand) return null;
  try {
    const mode = sessionStorage.getItem(websiteScrapeJobModeStorageKey(brand));
    return mode === "blog" || mode === "generic" ? mode : null;
  } catch {
    return null;
  }
}

export function writeStoredWebsiteScrapeJobMode(brand, mode) {
  if (typeof window === "undefined" || !brand) return;
  try {
    if (mode === "blog" || mode === "generic") {
      sessionStorage.setItem(websiteScrapeJobModeStorageKey(brand), mode);
    } else {
      sessionStorage.removeItem(websiteScrapeJobModeStorageKey(brand));
    }
  } catch {
    /* ignore */
  }
}

export function linksFromScrapeJob(job) {
  if (!job?.pages?.length) return [];
  return job.pages.map((p) => ({
    url: p.url,
    label: p.label || "",
    category: p.category || "",
  }));
}

export function discoverMetaFromScrapeJob(job) {
  if (!job) return null;
  return {
    total: job.pages?.length ?? job.totalCount ?? 0,
    seedUrl: job.seedUrl || "",
    postCount: 0,
    feedUrlCount: 0,
    folderId: job.folderId || "",
    folderName: job.folderName || "",
    mode: job.mode || "generic",
  };
}
