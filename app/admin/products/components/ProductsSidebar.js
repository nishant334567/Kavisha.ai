"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, X } from "lucide-react";

const BASE = "/admin/products";

function useBrandQuery() {
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  return brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
}

export default function ProductsSidebar({ onClose }) {
  const router = useRouter();
  const pathname = usePathname();
  const qs = useBrandQuery();

  const listHref = `${BASE}${qs}`;
  const ordersHref = `${BASE}/orders${qs}`;
  const addNewHref = `${BASE}/add-new${qs}`;

  const isActive = (path) => {
    if (path === BASE) return pathname === BASE || pathname === `${BASE}/`;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const navLinkClass = (href) => {
    const path = href.split("?")[0];
    const active = isActive(path);
    return [
      "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
      active ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50",
    ].join(" ");
  };

  return (
    <aside className="h-full w-56 shrink-0 border-r border-gray-200 py-6 px-4 overflow-y-auto bg-white relative">
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
      <button
        type="button"
        onClick={() => router.back()}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 mb-4 transition-colors"
        aria-label="Back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-lg font-bold text-gray-900 mb-4">My Products</h2>

      <Link
        href={addNewHref}
        className="flex items-center justify-center w-full py-2.5 rounded-full px-4 mb-6 text-sm font-medium border border-[#2D545E] text-[#2D545E] bg-[#2D545E]/5 hover:bg-[#2D545E]/10 transition-colors"
      >
        Add Product
      </Link>

      <nav className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Back
        </button>
        <Link href={listHref} className={navLinkClass(listHref)}>
          List of products
        </Link>
        <Link href={ordersHref} className={navLinkClass(ordersHref)}>
          Orders
        </Link>
      </nav>
    </aside>
  );
}
