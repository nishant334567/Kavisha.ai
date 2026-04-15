"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { Briefcase, ClipboardList, FileText, X } from "lucide-react";

const BASE = "/admin/jobs";

function useBrandQuery() {
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  return brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
}

export default function AdminJobsSidebar({ onClose = () => {} }) {
  const pathname = usePathname();
  const qs = useBrandQuery();

  const listHref = `${BASE}${qs}`;
  const applicationsHref = `${BASE}/applications${qs}`;
  const requirementsHref = `${BASE}/requirements${qs}`;

  const isApplications =
    pathname === `${BASE}/applications` || pathname.startsWith(`${BASE}/applications/`);
  const isRequirements =
    pathname === `${BASE}/requirements` || pathname.startsWith(`${BASE}/requirements/`);
  const isAllJobs =
    pathname.startsWith(BASE) && !isApplications && !isRequirements;

  const navLinkClass = (active) =>
    [
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-muted-bg text-foreground"
        : "text-muted hover:bg-muted-bg hover:text-foreground",
    ].join(" ");

  return (
    <aside className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto border-r border-border bg-card px-4 py-6 text-foreground md:h-full md:w-56 md:shrink-0">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
        aria-label="Close admin jobs panel"
      >
        <X className="h-5 w-5" />
      </button>
      <h2 className="mb-5 pr-10 text-lg font-bold text-foreground">Jobs</h2>

      <nav className="flex min-h-0 flex-1 flex-col gap-1">
        <Link href={listHref} className={navLinkClass(isAllJobs)}>
          <Briefcase className="h-4 w-4 shrink-0" />
          All jobs
        </Link>
        <Link href={applicationsHref} className={navLinkClass(isApplications)}>
          <ClipboardList className="h-4 w-4 shrink-0" />
          All applications
        </Link>
        <Link href={requirementsHref} className={navLinkClass(isRequirements)}>
          <FileText className="h-4 w-4 shrink-0" />
          Completed requirements
        </Link>
      </nav>
    </aside>
  );
}
