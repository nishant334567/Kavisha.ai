"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, Home, MessagesSquare, Link2 } from "lucide-react";

const ACTIVE = "text-[#00888E]";
const INACTIVE = "text-gray-900";

const items = [
  {
    href: "/featured",
    label: "Services",
    icon: LayoutGrid,
    match: (p) => p === "/featured" || p.startsWith("/featured/"),
  },
  { href: "/community", label: "Community", icon: Users, match: (p) => p.startsWith("/community") },
  { href: "/", label: "Home", icon: Home, match: (p) => p === "/" },
  { href: "/chats", label: "Chats", icon: MessagesSquare, match: (p) => p.startsWith("/chats") },
  { href: "/links", label: "Links", icon: Link2, match: (p) => p.startsWith("/links") },
];

export default function MobileBottomNav() {
  const pathname = usePathname() || "";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_14px_rgba(0,0,0,0.06)]"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
      }}
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around gap-0 px-1 pt-2">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 px-0.5 text-[11px] font-medium leading-tight ${
                active ? ACTIVE : INACTIVE
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${active ? "stroke-[2.5px]" : "stroke-2"}`}
                aria-hidden
              />
              <span className="truncate max-w-full text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
