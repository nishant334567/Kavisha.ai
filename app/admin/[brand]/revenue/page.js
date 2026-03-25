"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, IndianRupee } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function RevenueSection({ title, rows, emptyMessage, metricLabel }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-highlight">{title}</h2>
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
                  Revenue
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
      { label: "Products", value: totals.products || 0 },
      { label: "Services", value: totals.services || 0 },
      { label: "Community", value: totals.community || 0 },
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
        <h1 className="font-zen text-2xl font-bold uppercase text-highlight">
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
                  <p className="text-sm font-medium text-muted">
                    {card.label}
                  </p>
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
          />

          <RevenueSection
            title="Service Revenue"
            rows={revenueData?.breakdown?.services || []}
            metricLabel="Bookings"
            emptyMessage="No completed service revenue yet."
          />

          <RevenueSection
            title="Community Revenue"
            rows={revenueData?.breakdown?.community || []}
            metricLabel="Payments"
            emptyMessage="No community revenue tracked for this brand yet."
          />
        </div>
      )}
    </div>
  );
}
