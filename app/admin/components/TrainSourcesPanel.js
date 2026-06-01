"use client";

import { useEffect, useState } from "react";
import {
  AlignLeft,
  ChevronRight,
  FileText,
  Globe,
  Newspaper,
  PenLine,
  Upload,
  Youtube,
} from "lucide-react";
import {
  useWebsiteImport,
  WebsiteImportPanel,
} from "@/app/admin/components/WebsiteImportWizard";

const SOURCE_OPTIONS = [
  {
    id: "pdf",
    label: "PDF document",
    description: "Upload and extract text from PDFs",
    icon: FileText,
  },
  {
    id: "youtube",
    label: "Youtube video",
    description: "Transcribe and train from videos",
    icon: Youtube,
    comingSoon: true,
  },
  {
    id: "text",
    label: "Direct text",
    description: "Type or paste directly",
    icon: AlignLeft,
  },
  {
    id: "website",
    label: "Website",
    description: "Import pages from your site",
    icon: Globe,
    importMode: "generic",
  },
  {
    id: "blog",
    label: "Blog",
    description: "Import posts from RSS or sitemap",
    icon: Newspaper,
    importMode: "blog",
  },
];

const fieldLabel =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-muted";
const fieldInput =
  "w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground transition-all duration-200 placeholder:text-muted focus:border-foreground/25 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-highlight px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-highlight/90 hover:shadow-md focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50";

function ScrapeJobSourceSync({ selectedSource, onSelectSource }) {
  const { importInProgress, activeMode } = useWebsiteImport();

  useEffect(() => {
    if (!importInProgress || !activeMode) return;
    const target = activeMode === "blog" ? "blog" : "website";
    if (selectedSource !== target) {
      onSelectSource(target);
    }
  }, [importInProgress, activeMode, selectedSource, onSelectSource]);

  return null;
}

function SourceNavItem({ option, selected, onSelect, showActivity }) {
  const Icon = option.icon;
  const isActive = selected === option.id;

  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(option.id)}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] ${
        isActive
          ? "border border-border bg-card text-foreground shadow-sm"
          : "border border-transparent text-muted hover:bg-card/70 hover:text-foreground"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
          isActive
            ? "bg-muted-bg text-foreground"
            : "bg-card/80 text-muted group-hover:text-foreground"
        }`}
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={`block truncate text-sm tracking-tight ${
              isActive ? "font-semibold" : "font-medium"
            }`}
          >
            {option.label}
          </span>
          {showActivity ? (
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-foreground/50" />
          ) : null}
          {option.comingSoon ? (
            <span className="shrink-0 rounded-full border border-border/70 bg-background px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
              Soon
            </span>
          ) : null}
        </span>
      </span>
      {isActive ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
      ) : null}
    </button>
  );
}

function PanelHeader({ option }) {
  const Icon = option.icon;
  return (
    <header className="border-b border-border/60 bg-muted-bg/30 px-6 py-6 sm:px-8 sm:py-7">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-highlight text-white shadow-sm">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="font-baloo text-2xl font-bold tracking-tight text-highlight">
            {option.label}
          </h2>
          <p className="mt-0.5 max-w-md text-sm leading-relaxed text-muted">
            {option.description}
          </p>
        </div>
      </div>
    </header>
  );
}

export default function TrainSourcesPanel({
  fileInputRef,
  folders,
  isTraining,
  uploading,
  uploadFolderId,
  onUploadFolderChange,
  uploadSourceUrl,
  onUploadSourceUrlChange,
  selectedFileName,
  onChooseFile,
  onOpenTextModal,
  onFileChange,
}) {
  const [selectedSource, setSelectedSource] = useState("pdf");
  const { importInProgress, activeMode } = useWebsiteImport();

  const activeOption =
    SOURCE_OPTIONS.find((o) => o.id === selectedSource) || SOURCE_OPTIONS[0];

  const isImportActiveForOption = (option) => {
    if (!importInProgress || !option.importMode) return false;
    if (activeMode) return activeMode === option.importMode;
    return option.importMode === "generic";
  };

  return (
    <>
      <ScrapeJobSourceSync
        selectedSource={selectedSource}
        onSelectSource={setSelectedSource}
      />

      <div className="train-sources-shell mb-12 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid min-h-[460px] grid-cols-1 lg:grid-cols-[3fr_10fr]">
          {/* Left — source list (30% of right panel width) */}
          <aside className="border-b border-border/60 bg-muted-bg/40 p-3 lg:border-b-0 lg:border-r lg:p-4">
            <nav className="flex flex-col gap-1">
              {SOURCE_OPTIONS.map((option) => (
                <SourceNavItem
                  key={option.id}
                  option={option}
                  selected={selectedSource}
                  onSelect={setSelectedSource}
                  showActivity={isImportActiveForOption(option)}
                />
              ))}
            </nav>
          </aside>

          {/* Right — detail panel */}
          <section className="flex min-w-0 flex-col bg-card">
            <PanelHeader option={activeOption} />

            <div
              key={selectedSource}
              className="train-panel-enter flex flex-1 flex-col px-6 py-7 sm:px-8 sm:py-8"
            >
              <div className="mx-auto w-full max-w-md">
                {selectedSource === "pdf" && (
                  <div className="flex flex-col">
                    <label className={fieldLabel}>Folder</label>
                    <select
                      value={uploadFolderId}
                      onChange={(e) => onUploadFolderChange(e.target.value)}
                      disabled={isTraining}
                      className={`${fieldInput} mb-5`}
                    >
                      <option value="">Unfiled</option>
                      {folders.map((f) => (
                        <option key={f._id} value={f._id}>
                          {f.name}
                        </option>
                      ))}
                    </select>

                    <label className={fieldLabel}>
                      Source URL{" "}
                      <span className="font-normal normal-case tracking-normal text-muted/80">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="url"
                      value={uploadSourceUrl}
                      onChange={(e) => onUploadSourceUrlChange(e.target.value)}
                      placeholder="https://example.com/document"
                      disabled={isTraining}
                      className={`${fieldInput} mb-5`}
                    />

                    <label className={fieldLabel}>PDF file</label>
                    <button
                      type="button"
                      onClick={onChooseFile}
                      disabled={uploading || isTraining}
                      className="group mb-6 flex w-full items-center gap-4 rounded-xl border border-dashed border-border bg-muted-bg/25 px-5 py-5 text-left transition-all duration-200 hover:bg-muted-bg/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card text-muted shadow-sm transition-colors group-hover:text-foreground">
                        <Upload className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          {selectedFileName || "Choose a PDF file"}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          Click to browse · PDF only
                        </span>
                      </span>
                    </button>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={onFileChange}
                      accept=".pdf"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={onChooseFile}
                      disabled={uploading || isTraining}
                      className={`${primaryBtn} w-full sm:w-auto`}
                    >
                      {isTraining
                        ? "Training..."
                        : uploading
                          ? "Uploading..."
                          : "Upload PDF"}
                    </button>
                  </div>
                )}

                {selectedSource === "youtube" && (
                  <div className="flex flex-col">
                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted-bg/20 px-6 py-10 text-center">
                      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-muted shadow-sm">
                        <Youtube className="h-7 w-7" strokeWidth={1.5} />
                      </span>
                      <p className="text-sm font-medium text-foreground">
                        YouTube transcription
                      </p>
                      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
                        Paste a video link and we&apos;ll transcribe it for your
                        knowledge base. This feature is coming soon.
                      </p>
                    </div>
                  </div>
                )}

                {selectedSource === "text" && (
                  <div className="flex flex-col">
                    <p className="mb-6 text-sm leading-relaxed text-muted">
                      Open the editor to add a title, paste your content, pick a
                      folder, and save to your knowledge base.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenTextModal}
                      disabled={isTraining}
                      className={`${primaryBtn} w-full sm:w-auto`}
                    >
                      <PenLine className="h-4 w-4" />
                      {isTraining ? "Training..." : "Open text editor"}
                    </button>
                  </div>
                )}

                {selectedSource === "website" && (
                  <WebsiteImportPanel mode="generic" />
                )}

                {selectedSource === "blog" && (
                  <WebsiteImportPanel mode="blog" />
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
