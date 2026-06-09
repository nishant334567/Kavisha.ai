"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Receipt } from "lucide-react";

function formatRs(amount) {
  return `Rs. ${Number(amount).toLocaleString("en-IN")}/-`;
}

function monthKeyFromDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function buildMonthOptions(invoices) {
  const keys = new Set();
  const now = new Date();
  keys.add(monthKeyFromDate(now));

  for (const row of invoices) {
    const key = monthKeyFromDate(row.paidAt);
    if (key) keys.add(key);
  }

  if (invoices.length) {
    const earliestMs = invoices.reduce((min, row) => {
      const t = new Date(row.paidAt).getTime();
      return t < min ? t : min;
    }, new Date(invoices[0].paidAt).getTime());
    const cursor = new Date(earliestMs);
    cursor.setDate(1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor <= end) {
      keys.add(monthKeyFromDate(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return Array.from(keys).sort((a, b) => b.localeCompare(a));
}

function filterInvoicesByMonth(invoices, monthKey) {
  if (!monthKey) return invoices;
  return invoices.filter((row) => monthKeyFromDate(row.paidAt) === monthKey);
}

function invoiceStatusLabel(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "failed") return { text: "Failed", className: "text-red-600" };
  if (normalized === "rejected") return { text: "Rejected", className: "text-red-600" };
  if (normalized === "pending") return { text: "Pending", className: "text-amber-600" };
  if (normalized === "refunded") return { text: "Refunded", className: "text-muted" };
  if (normalized === "cancelled" || normalized === "canceled") {
    return { text: "Cancelled", className: "text-muted" };
  }
  return { text: "Paid", className: "text-foreground" };
}

function invoiceIsDownloadable(status) {
  const normalized = String(status || "").toLowerCase();
  return normalized === "paid" || normalized === "success" || normalized === "refunded";
}

function downloadInvoice(row, brandName, isDemo) {
  if (row.invoiceUrl) {
    const link = document.createElement("a");
    link.href = row.invoiceUrl;
    link.download = `invoice-${row.id}.pdf`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
    return;
  }

  const status = invoiceStatusLabel(row.status).text;
  const lines = [
    "KAVISHA — TAX INVOICE",
    "=======================",
    "",
    `Invoice no.: ${row.id}`,
    `Date: ${row.dateLabel}`,
    `Brand: ${brandName || "—"}`,
    "",
    `Description: ${row.description}`,
    `Amount: ${formatRs(row.amount)}`,
    `Status: ${status}`,
    "",
    isDemo
      ? "(Demo invoice — connect billing API for official PDF downloads.)"
      : "",
  ].filter(Boolean);

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoice-${row.id}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function InvoicesSection({ invoices, isDemo, brandName }) {
  const monthOptions = useMemo(() => buildMonthOptions(invoices), [invoices]);
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    const preferred =
      monthOptions.find((key) => filterInvoicesByMonth(invoices, key).length > 0) ||
      monthOptions[0] ||
      monthKeyFromDate(new Date()) ||
      "";
    setSelectedMonth((prev) =>
      prev && monthOptions.includes(prev) ? prev : preferred,
    );
  }, [invoices, monthOptions]);

  const filtered = useMemo(
    () => filterInvoicesByMonth(invoices, selectedMonth),
    [invoices, selectedMonth],
  );

  const hasAnyInvoices = invoices.length > 0;

  return (
    <section className="mb-10">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-semibold text-foreground">Invoices</h2>
            {isDemo ? (
              <span className="rounded-full bg-muted-bg px-2.5 py-0.5 text-xs font-medium text-muted">
                Demo
              </span>
            ) : null}
          </div>
          {hasAnyInvoices ? (
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-9 text-sm text-foreground transition-colors hover:border-highlight/30 focus:border-highlight/50 focus:outline-none focus:ring-1 focus:ring-highlight/20"
                aria-label="Filter invoices by month"
              >
                {monthOptions.map((key) => (
                  <option key={key} value={key}>
                    {formatMonthLabel(key)}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
            </div>
          ) : null}
        </div>

        {!hasAnyInvoices ? (
          <div className="px-5 py-10 text-center">
            <Receipt className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-2 text-sm font-medium text-foreground">No payments yet</p>
            <p className="mt-0.5 text-xs text-muted">
              All plan and service payments will show up here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="w-12 px-3 py-3">
                    <span className="sr-only">Download</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted">
                      No payments in {formatMonthLabel(selectedMonth)}.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const status = invoiceStatusLabel(row.status);
                    const canDownload = invoiceIsDownloadable(row.status);
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 text-foreground">
                          {row.dateLabel}
                        </td>
                        <td className="px-5 py-3.5 text-foreground">
                          {row.description}
                        </td>
                        <td className={`whitespace-nowrap px-5 py-3.5 ${status.className}`}>
                          {status.text}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-foreground">
                          {formatRs(row.amount)}
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <button
                            type="button"
                            disabled={!canDownload}
                            onClick={() => downloadInvoice(row, brandName, isDemo)}
                            title={
                              canDownload
                                ? "Download invoice"
                                : "Invoice available after successful payment"
                            }
                            aria-label={
                              canDownload
                                ? `Download invoice for ${row.dateLabel}`
                                : `Invoice not available for ${row.dateLabel}`
                            }
                            className="inline-flex rounded-lg p-1.5 text-muted transition-colors hover:bg-muted-bg hover:text-highlight disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
