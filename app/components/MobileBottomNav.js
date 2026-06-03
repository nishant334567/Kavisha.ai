"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Home,
  MessagesSquare,
  MessageCircleMore,
  Sparkles,
} from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useMessagesInbox } from "@/app/components/GlobalMessages";

const ACTIVE = "text-[#00888E]";
const INACTIVE = "text-muted";

function useBottomNavItems(brand) {
  return useMemo(() => {
    const communityEnabled =
      !!brand?.enableFriendConnect || !!brand?.enableProfessionalConnect;
    const isKavishaMainBrand = brand?.subdomain === "kavisha";
    const showCommunityOnBrand =
      communityEnabled &&
      brand?.subdomain &&
      !isKavishaMainBrand;

    const communityPath =
      "/community" +
      (brand?.subdomain
        ? `?subdomain=${encodeURIComponent(brand.subdomain)}`
        : "");
    const list = [
      {
        key: "featured",
        href: "/featured",
        label: "Services",
        icon: LayoutGrid,
        match: (p) => p === "/featured" || p.startsWith("/featured/"),
      },
    ];

    if (showCommunityOnBrand) {
      list.push({
        key: "community",
        href: communityPath,
        label: brand?.communityName || "Community",
        icon: Users,
        match: (p) => p.startsWith("/community"),
      });
    }

    if (isKavishaMainBrand) {
      list.push({
        key: "widget-intro",
        href: "/widget-intro",
        label: "My agent",
        icon: Sparkles,
        match: (p) => p.startsWith("/widget-intro"),
      });
    }

    list.push(
      {
        key: "home",
        href: "/",
        label: "Home",
        icon: Home,
        match: (p) => p === "/",
      },
      {
        key: "chats",
        href: "/chats",
        label: "Chats",
        icon: MessagesSquare,
        match: (p) => p.startsWith("/chats"),
      }
    );

    return list;
  }, [
    brand?.subdomain,
    brand?.enableFriendConnect,
    brand?.enableProfessionalConnect,
    brand?.communityName,
  ]);
}

export default function MobileBottomNav({ embedded = false }) {
  const pathname = usePathname() || "";
  const brand = useBrandContext();
  const visibleItems = useBottomNavItems(brand);
  const messagesInbox = useMessagesInbox();
  const showMessagesNav = Boolean(messagesInbox?.enabled);

  return (
    <nav
      className={[
        "md:hidden",
        embedded
          ? "border-t border-border bg-transparent"
          : "fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 shadow-[0_-4px_14px_rgba(0,0,0,0.06)] backdrop-blur",
      ].join(" ")}
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
      }}
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around gap-0 px-1 pt-2">
        {visibleItems.map(({ key, href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={key}
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
        {showMessagesNav && (
          <button
            type="button"
            onClick={messagesInbox.openInbox}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 px-0.5 text-[11px] font-medium leading-tight ${
              messagesInbox.showInbox ? ACTIVE : INACTIVE
            }`}
            aria-label="Open messages inbox"
            aria-pressed={messagesInbox.showInbox}
          >
            <MessageCircleMore
              className={`h-5 w-5 shrink-0 ${messagesInbox.showInbox ? "stroke-[2.5px]" : "stroke-2"}`}
              aria-hidden
            />
            <span className="max-w-full truncate text-center">Messages</span>
          </button>
        )}
      </div>
    </nav>
  );
}
