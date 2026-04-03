"use client";

import { useCallback, useEffect, useState } from "react";

const defaultBrand = "entrackr";

export default function BlogIngestPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [brand, setBrand] = useState(defaultBrand);
  const [busy, setBusy] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [seedError, setSeedError] = useState(null);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [listData, setListData] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(200);

  const loadList = useCallback(
    async (opts) => {
      const lim = opts?.limit ?? pageSize;
      const skipVal = opts?.skip ?? page * pageSize;
      setListLoading(true);
      setListError(null);
      try {
        const q = new URLSearchParams();
        if (brand.trim()) q.set("brand", brand.trim());
        q.set("source", "entrackr");
        if (statusFilter) q.set("status", statusFilter);
        q.set("limit", String(lim));
        q.set("skip", String(skipVal));
        const res = await fetch(`/api/blog-ingest/urls?${q}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || res.statusText);
        setListData(j);
      } catch (e) {
        setListError(e.message || "Failed to load");
        setListData(null);
      } finally {
        setListLoading(false);
      }
    },
    [brand, statusFilter, page, pageSize]
  );

  useEffect(() => {
    setPage(0);
  }, [brand, statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function runSeed() {
    setBusy(true);
    setSeedError(null);
    setSeedResult(null);
    try {
      const res = await fetch("/api/blog-ingest/seed-entrackr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(year),
          brand: brand.trim(),
          source: "entrackr",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setSeedResult(j);
      setPage(0);
      await loadList({ skip: 0, limit: pageSize });
    } catch (e) {
      setSeedError(e.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 font-sans text-sm">
      <h1 className="text-xl font-semibold text-neutral-900">Entrackr blog URL ingest</h1>
      <p className="mt-1 text-neutral-600">
        Enter a <strong>year</strong> to load every child sitemap dated that year (e.g.{" "}
        <code className="rounded bg-neutral-100 px-1">sitemap_2024-03-15.xml</code>). URLs already in MongoDB are
        skipped (unchanged).
      </p>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="font-medium text-neutral-800">Seed from sitemap</h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500">Year</label>
            <input
              type="number"
              min={1990}
              max={2100}
              className="mt-1 w-28 rounded border border-neutral-300 px-2 py-1.5"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500">Brand (stored on new rows)</label>
            <input
              type="text"
              className="mt-1 w-40 rounded border border-neutral-300 px-2 py-1.5"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="entrackr"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={runSeed}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy ? "Fetching…" : "Fetch year & save URLs"}
          </button>
        </div>

        {seedError && (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-red-800">{seedError}</p>
        )}

        {seedResult && (
          <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-neutral-800">
            <p className="font-medium">Result</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-neutral-700">
              <li>Year: {seedResult.year}</li>
              <li>Child sitemaps for this year: {seedResult.childSitemapsForYear ?? 0}</li>
              <li>Unique article URLs: {seedResult.uniqueArticleUrls ?? 0}</li>
              <li className="text-green-800">New rows inserted: {seedResult.newRowsInserted ?? 0}</li>
              <li className="text-neutral-600">Already in DB (skipped): {seedResult.existingUrlsSkipped ?? 0}</li>
              {seedResult.childSitemapErrors?.length > 0 && (
                <li className="text-amber-800">
                  Child sitemap errors: {seedResult.childSitemapErrors.length}{" "}
                  <span className="text-xs">(see JSON below)</span>
                </li>
              )}
            </ul>
            <pre className="mt-3 max-h-40 overflow-auto rounded bg-white p-2 text-xs text-neutral-600">
              {JSON.stringify(seedResult, null, 2)}
            </pre>
          </div>
        )}
      </section>

      <section className="mt-10 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium text-neutral-800">Stored URLs</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-neutral-500">
              Status
              <select
                className="ml-1 rounded border border-neutral-300 px-2 py-1"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="pending">pending</option>
                <option value="scraped">scraped</option>
                <option value="failed">failed</option>
              </select>
            </label>
            <label className="text-xs text-neutral-500">
              Per page
              <select
                className="ml-1 rounded border border-neutral-300 px-2 py-1"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
              >
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </label>
            <button
              type="button"
              onClick={loadList}
              className="rounded border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {listData?.byStatus && listData.total != null && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-neutral-600">
            <p>
              Counts: pending <strong>{listData.byStatus.pending}</strong>, scraped{" "}
              <strong>{listData.byStatus.scraped}</strong>, failed <strong>{listData.byStatus.failed}</strong>
              <span className="text-neutral-500">
                {" "}
                — rows <strong>{listData.total === 0 ? 0 : page * pageSize + 1}</strong>–
                <strong>{page * pageSize + (listData.items?.length ?? 0)}</strong> of{" "}
                <strong>{listData.total}</strong>
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 0 || listLoading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-neutral-500">
                Page <strong>{page + 1}</strong> of <strong>{Math.max(1, Math.ceil(listData.total / pageSize))}</strong>
              </span>
              <button
                type="button"
                disabled={listLoading || (page + 1) * pageSize >= listData.total}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {listLoading && <p className="mt-4 text-neutral-500">Loading…</p>}
        {listError && <p className="mt-4 text-red-600">{listError}</p>}

        {!listLoading && listData?.items && (
          <div className="mt-4 max-h-[480px] overflow-auto rounded border border-neutral-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-neutral-100">
                <tr>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Sitemap date</th>
                  <th className="px-2 py-2 font-medium">URL</th>
                </tr>
              </thead>
              <tbody>
                {listData.items.map((row) => (
                  <tr key={row._id} className="border-t border-neutral-100">
                    <td className="whitespace-nowrap px-2 py-1.5 font-medium text-neutral-700">{row.status}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-neutral-500">{row.sitemapDate || "—"}</td>
                    <td className="break-all px-2 py-1.5 text-neutral-800">
                      <a href={row.url} className="text-blue-700 underline hover:text-blue-900" target="_blank" rel="noreferrer">
                        {row.url}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
