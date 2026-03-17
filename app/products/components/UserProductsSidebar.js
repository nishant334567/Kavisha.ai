"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ShoppingCart, ClipboardList, Package, X } from "lucide-react";
import { useCart } from "@/app/context/cart/CartContextProvider";

export default function UserProductsSidebar({ onClose }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const { cartCount } = useCart();

  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";

  const navItems = [
    {
      label: "Products",
      href: `/products${qs}`,
      match: "/products",
      icon: Package,
    },
    {
      label: "Order History",
      href: `/orders${qs}`,
      match: "/orders",
      icon: ClipboardList,
    },
    {
      label: "Cart",
      href: `/cart${qs}`,
      match: "/cart",
      icon: ShoppingCart,
      badge: cartCount > 0 ? (cartCount > 99 ? "99+" : String(cartCount)) : null,
    },
  ];

  return (
    <aside className="relative h-full w-56 shrink-0 border-r border-gray-200 py-6 px-4 overflow-y-auto bg-white">
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
      <h2 className="text-lg font-bold text-gray-900 mb-5">Shop</h2>
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
                "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50",
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {item.label}
              </span>
              {item.badge && (
                <span className="min-w-[18px] h-[18px] px-1.5 inline-flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-gray-900">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
