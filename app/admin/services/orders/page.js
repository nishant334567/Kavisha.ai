"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { CalendarDays } from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(hhmm) {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? "am" : "pm";
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function ServiceOrdersPage() {
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const serviceIdFilter = searchParams?.get("serviceId")?.trim() || null;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!brand) {
      setLoading(false);
      return;
    }
    const url = new URL("/api/admin/bookings", window.location.origin);
    url.searchParams.set("brand", brand);
    if (serviceIdFilter) url.searchParams.set("serviceId", serviceIdFilter);

    fetch(url.toString(), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setBookings(d.bookings || []);
      })
      .catch(() => setError("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, [brand, serviceIdFilter]);

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Booking orders
      </h1>

      {!brand ? (
            <p className="text-gray-500">Select a brand to view bookings.</p>
          ) : loading ? (
            <p className="text-gray-500">Loading bookings…</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : bookings.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
              <CalendarDays className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-700 font-medium">No booking orders yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Booking entries will appear here after users start booking.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Booker
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.map((b) => {
                      const customer = b.customerId;
                      const name =
                        typeof customer === "object" && customer
                          ? customer.name
                          : "—";
                      const email =
                        typeof customer === "object" && customer
                          ? customer.email
                          : "—";
                      const phone =
                        typeof customer === "object" && customer
                          ? customer.phone || "—"
                          : "—";
                      return (
                        <tr key={b._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {b.serviceSnapshot?.title || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatDate(b.date)} · {formatTime(b.startTime)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div>{name}</div>
                            <div className="text-gray-500">{email}</div>
                            <div className="text-gray-500">{phone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                b.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : b.paymentStatus === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {b.status === "cancelled"
                                ? "Cancelled"
                                : b.paymentStatus === "completed"
                                  ? "Paid"
                                  : "Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            Rs. {Math.round(b.totalAmount || 0)}/-
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
    </>
  );
}
