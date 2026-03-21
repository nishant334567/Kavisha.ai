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
      <h2 className="mb-5 text-lg font-bold text-foreground">Shop</h2>
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
                  ? "bg-muted-bg text-foreground"
                  : "text-muted hover:bg-muted-bg hover:text-foreground",
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
