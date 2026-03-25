"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, IndianRupee, Info } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function InfoTooltip({ message }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="group relative inline-flex items-center">
      <button
        type="button"
        aria-label="Revenue info"
        className="inline-flex items-center justify-center rounded-full p-0.5 text-muted transition-colors hover:bg-muted-bg hover:text-highlight focus:outline-none"
        onClick={() => setIsOpen((prev) => !prev)}
        onBlur={() => setIsOpen(false)}
      >
        <Info className="h-4 w-4" />
      </button>
      <div
        className={`pointer-events-none absolute left-0 top-full z-10 mt-2 w-64 rounded-lg border border-border bg-muted-bg px-3 py-2 text-xs leading-5 text-muted shadow-sm transition-opacity duration-150 ${
          isOpen
            ? "visible opacity-100"
            : "invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
        }`}
      >
        {message}
      </div>
    </div>
  );
}

function RevenueSection({
  title,
  rows,
  emptyMessage,
  metricLabel,
  infoMessage,
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-highlight">{title}</h2>
          {infoMessage ? <InfoTooltip message={infoMessage} /> : null}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="px-6 py-8 text-sm text-muted">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted-bg">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-muted">
                  Name
                </th>
                <th className="px-6 py-3 text-left font-medium text-muted">
                  {metricLabel}
                </th>
                <th className="px-6 py-3 text-right font-medium text-muted">
                  Your Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id || row.name}>
                  <td className="px-6 py-4 text-foreground">{row.name}</td>
                  <td className="px-6 py-4 text-muted">
                    {row.quantity ??
                      row.orders ??
                      row.bookings ??
                      row.payments ??
                      0}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-foreground">
                    {formatCurrency(row.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function RevenuePage() {
  const router = useRouter();
  const brand = useBrandContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revenueData, setRevenueData] = useState(null);

  useEffect(() => {
    const fetchRevenue = async () => {
      if (!brand?.subdomain) return;

      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/admin/revenue?brand=${encodeURIComponent(brand.subdomain)}`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch revenue");
        }

        setRevenueData(data);
      } catch (err) {
        setError(err?.message || "Failed to fetch revenue");
      } finally {
        setLoading(false);
      }
    };

    fetchRevenue();
  }, [brand?.subdomain]);

  const cards = useMemo(() => {
    const totals = revenueData?.totals || {};
    return [
      { label: "Total Revenue", value: totals.overall || 0 },
      {
        label: "Products",
        value: totals.products || 0,
        infoMessage: "Kavisha keeps a cut of 5%, and the rest is yours.",
      },
      {
        label: "Bookings",
        value: totals.services || 0,
        infoMessage: "Kavisha keeps a cut of 5%, and the rest is yours.",
      },
      {
        label: "Community",
        value: totals.community || 0,
        infoMessage: "Kavisha keeps 50%, and the rest is yours.",
      },
    ];
  }, [revenueData]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-foreground transition-opacity hover:opacity-70"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-baloo text-2xl font-bold uppercase text-highlight">
          Revenue
        </h1>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-10 text-sm text-muted shadow-sm">
          Loading revenue...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-2 text-highlight">
                  <IndianRupee className="h-4 w-4" />
                  <p className="text-sm font-medium text-muted">{card.label}</p>
                  {card.infoMessage ? (
                    <InfoTooltip message={card.infoMessage} />
                  ) : null}
                </div>
                <p className="text-2xl font-semibold text-highlight">
                  {formatCurrency(card.value)}
                </p>
              </div>
            ))}
          </div>

          <RevenueSection
            title="Product Revenue"
            rows={revenueData?.breakdown?.products || []}
            metricLabel="Units Sold"
            emptyMessage="No completed product revenue yet."
            infoMessage="Transaction charges of 5%, inclusive of taxes."
          />

          <RevenueSection
            title="Booking Revenue"
            rows={revenueData?.breakdown?.services || []}
            metricLabel="Bookings"
            emptyMessage="No completed service revenue yet."
            infoMessage="Transaction charges of 5%, inclusive of taxes."
          />

          <RevenueSection
            title="Community Revenue"
            rows={revenueData?.breakdown?.community || []}
            metricLabel="Payments"
            emptyMessage="No community revenue tracked for this brand yet."
            infoMessage="Earnings split 50:50 between you and the platform."
          />
        </div>
      )}
    </div>
  );
}
