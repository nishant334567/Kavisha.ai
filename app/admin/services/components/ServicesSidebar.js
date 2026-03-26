"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, CalendarClock, ClipboardList, Plus, X } from "lucide-react";

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

export default function ServicesSidebar({ onClose }) {
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
        ? "bg-muted-bg text-foreground"
        : "text-muted hover:text-foreground hover:bg-card",
    ].join(" ");
  };

  return (
    <aside className="relative h-full w-56 shrink-0 overflow-y-auto border-r border-border bg-card px-4 py-6 text-foreground">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-4 rounded-lg p-1.5 text-muted hover:bg-muted-bg hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 rounded-lg p-1.5 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
        aria-label="Back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="mb-4 text-lg font-bold text-foreground">My Services</h2>

      <Link
        href={addNewHref}
        className="mb-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-highlight bg-highlight/5 px-4 py-2.5 text-sm font-medium text-highlight transition-colors hover:bg-highlight/10"
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
