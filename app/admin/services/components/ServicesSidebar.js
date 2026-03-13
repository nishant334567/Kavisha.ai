"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, CalendarClock, ClipboardList, Plus } from "lucide-react";

const BASE = "/admin/services";

function useBrandQuery() {
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  return brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
}

export default function ServicesSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const qs = useBrandQuery();

  const listHref = `${BASE}${qs}`;
  const ordersHref = `${BASE}/orders${qs}`;
  const addNewHref = `${BASE}/add-new${qs}`;
  const calenderHref = `${BASE}/calender${qs}`;
  const isActive = (path) => {
    if (path === BASE) {
      return (
        pathname === BASE ||
        pathname === `${BASE}/` ||
        pathname.startsWith(`${BASE}/`) && !pathname.startsWith(`${BASE}/orders`)
      );
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const navLinkClass = (href) => {
    const path = href.split("?")[0];
    const active = isActive(path);
    return [
      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
      active
        ? "bg-gray-100 text-gray-900"
        : "text-gray-500 hover:text-gray-800 hover:bg-gray-50",
    ].join(" ");
  };

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 py-6 px-4 overflow-y-auto bg-white">
      <button
        type="button"
        onClick={() => router.back()}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 mb-4 transition-colors"
        aria-label="Back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-lg font-bold text-gray-900 mb-4">My Services</h2>

      <Link
        href={addNewHref}
        className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-full px-4 mb-6 text-sm font-medium border border-[#2D545E] text-[#2D545E] bg-[#2D545E]/5 hover:bg-[#2D545E]/10 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add booking
      </Link>

      <nav className="flex flex-col gap-1">
        <Link href={listHref} className={navLinkClass(listHref)}>
          <ClipboardList className="w-4 h-4" />
          List of services
        </Link>
        <Link href={ordersHref} className={navLinkClass(ordersHref)}>
          <CalendarClock className="w-4 h-4" />
          Booking orders
        </Link>
        <Link href={calenderHref} className={navLinkClass(calenderHref)}>
          <CalendarClock className="w-4 h-4" />
          My Calendar / Availability
        </Link>
      </nav>
    </aside>
  );
}
