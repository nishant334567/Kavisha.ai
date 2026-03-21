"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { CalendarClock, ClipboardList, X } from "lucide-react";

export default function UserServicesSidebar({ onClose }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();

  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";

  const navItems = [
    {
      label: "Services",
      href: `/services${qs}`,
      match: "/services",
      icon: ClipboardList,
    },
    {
      label: "Booking History",
      href: `/service-orders${qs}`,
      match: "/service-orders",
      icon: CalendarClock,
    },
  ];

  return (
    <aside className="relative h-full w-56 shrink-0 overflow-y-auto border-r border-border bg-card px-4 py-6 text-foreground">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-3 rounded-lg p-1.5 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      <h2 className="mb-5 text-lg font-bold text-foreground">Bookings</h2>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active =
            pathname === item.match || pathname.startsWith(`${item.match}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={[
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-muted-bg text-foreground"
                  : "text-muted hover:bg-muted-bg hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
