"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { Briefcase, ClipboardList, FileText, X } from "lucide-react";

export default function UserJobsSidebar({ onClose = () => {} }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();

  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";

  const isApplied = pathname.startsWith("/jobs/applied");
  const isPosted = pathname.startsWith("/jobs/posted");
  const isAll = !isApplied && !isPosted;

  const navItems = [
    {
      label: "All jobs",
      href: `/jobs${qs}`,
      active: isAll,
      icon: Briefcase,
    },
    {
      label: "Applied jobs",
      href: `/jobs/applied${qs}`,
      active: isApplied,
      icon: ClipboardList,
    },
    {
      label: "Your requirements",
      href: `/jobs/posted${qs}`,
      active: isPosted,
      icon: FileText,
    },
  ];

  return (
    <aside className="relative h-full w-56 shrink-0 overflow-y-auto border-r border-border bg-card px-4 py-6 text-foreground">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-4 rounded-lg p-1.5 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
        aria-label="Close jobs panel"
      >
        <X className="h-5 w-5" />
      </button>
      <h2 className="mb-5 pr-10 text-lg font-bold text-foreground">Jobs</h2>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={[
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                item.active
                  ? "bg-muted-bg text-foreground"
                  : "text-muted hover:bg-muted-bg hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
