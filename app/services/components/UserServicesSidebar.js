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
    <aside className="w-56 shrink-0 border-r border-gray-200 py-6 px-4 overflow-y-auto bg-white relative">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-3 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      <h2 className="text-lg font-bold text-gray-900 mb-5">Bookings</h2>
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
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50",
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
