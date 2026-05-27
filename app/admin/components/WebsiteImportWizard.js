"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import WebsiteLinksDialog from "@/app/admin/components/WebsiteLinksDialog";

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

  const getPayload = async (res) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const handleDiscover = async () => {
    const trimmed = websiteUrl.trim();
    if (!trimmed || !brandSubdomain || disabled) return;

    setError(null);
    setDiscovering(true);
    onTrainingChange?.({ type: "website-discover", title: trimmed });

    try {
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
    setLinks([]);
    setDiscoverMeta(null);
  };

  const handleImportComplete = (result) => {
    onComplete?.(result);
    handleDialogClose();
    setWebsiteUrl("");
  };

  const busy = discovering || disabled;

  return (
    <>
      <p className="mb-4 flex-1 text-sm text-muted">
        Find links on your site, scrape pages, then save to your knowledge base.
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

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <WebsiteLinksDialog
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
      />
    </>
  );
}
