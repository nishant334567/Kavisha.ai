"use client";

import { useEffect } from "react";
import Link from "next/link";
import SocketProvider from "../context/SocketProvider";
import {
  FirebaseSessionProvider,
  useFirebaseSession,
} from "../lib/firebase/FirebaseSessionProvider";
import BrandContextProvider, {
  useBrandContext,
} from "../context/brand/BrandContextProvider";
import Navbar from "./Navbar";
import Loader from "./Loader";
import { usePathname } from "next/navigation";
import AdminNavbar from "../admin/components/AdminNavbar";
import GlobalMessagesDesktopFab, {
  MessagesInboxProvider,
} from "./GlobalMessages";
import MobileBottomNav from "./MobileBottomNav";
import { CartContextProvider } from "../context/cart/CartContextProvider";

/** Widget iframe: socket for LiveChat DMs (must stay outside `ClientLayout` to avoid remounting). */
function WidgetSocketShell({ children }) {
  const { user } = useFirebaseSession();
  return (
    <SocketProvider userId={user?.id}>
      <div className="h-full min-h-0 bg-transparent text-foreground">{children}</div>
    </SocketProvider>
  );
}

export default function ClientLayout({ children }) {
  const pathname = usePathname();

  // If the user navigates to the full widget route, remove any floating embed iframe
  // that might already be mounted (prevents "widget inside widget").
  useEffect(() => {
    if (pathname !== "/widget") return;
    document.querySelector('iframe[data-kavisha-widget="1"]')?.remove();
  }, [pathname]);

  if (pathname === "/widget") {
    return (
      <FirebaseSessionProvider>
        <WidgetSocketShell>{children}</WidgetSocketShell>
      </FirebaseSessionProvider>
    );
  }

  const isMaintenancePage = pathname === "/maintenance";
  const isAdmin = pathname?.startsWith("/admin");
  const usesMobileChatDock =
    pathname?.startsWith("/chats") ||
    pathname?.startsWith("/jobs/posted/") ||
    (pathname?.startsWith("/community/") &&
      pathname !== "/community" &&
      pathname.split("/").filter(Boolean).length >= 2);

  return (
    <FirebaseSessionProvider>
      <BrandContextProvider>
        <CartContextProvider>
          <SocketSessionWrapper isAdmin={isAdmin}>
            <MessagesInboxProvider>
              {!isMaintenancePage && !isAdmin && <Navbar />}
              {!isMaintenancePage && isAdmin && <AdminNavbar />}
              <div
                className={
                  !isMaintenancePage
                    ? isAdmin
                      ? "pt-14"
                      : `pt-0 md:pt-14 ${pathname === "/"
                        ? "pb-32 md:pb-0"
                        : usesMobileChatDock
                          ? "pb-0 md:pb-0"
                          : "pb-[4.5rem] md:pb-0"
                      }`
                    : ""
                }
              >
                {children}
              </div>
              {!isMaintenancePage && !isAdmin && <MobileBottomArea />}
              {!isMaintenancePage && !isAdmin && pathname !== "/" && (
                <GlobalMessagesDesktopFab />
              )}
            </MessagesInboxProvider>
          </SocketSessionWrapper>
        </CartContextProvider>
      </BrandContextProvider>
    </FirebaseSessionProvider>
  );

  function SocketSessionWrapper({ children, isAdmin }) {
    const { user, loading } = useFirebaseSession();
    const shellClass = isAdmin
      ? "min-h-screen bg-background text-foreground"
      : "font-baloo min-h-screen bg-background text-foreground";
    if (loading) {
      return (
        <div className={shellClass}>
          <Loader loadingMessage="Loading Session..." />
        </div>
      );
    }
    return (
      <SocketProvider userId={user?.id}>
        <div className={shellClass}>{children}</div>
      </SocketProvider>
    );
  }

  function MobileBottomArea() {
    const { user } = useFirebaseSession();
    const brand = useBrandContext();
    const showHomepageLinks =
      pathname === "/" && brand?.subdomain && brand.subdomain !== "kavisha" && user;
    const linksQs = brand?.subdomain
      ? `?brand=${encodeURIComponent(brand.subdomain)}`
      : "";
    const homepageActionLinks = [
      { label: "TALK TO ME", path: "/chats", primary: true },
      { label: "COMMUNITY", path: "/community" },
      ...(brand?.enableLinks !== false
        ? [{ label: "LINKS", path: `/links${linksQs}` }]
        : []),
    ];

    if (!showHomepageLinks) {
      return <MobileBottomNav />;
    }

    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
        <div className="border-b border-border px-3 py-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {homepageActionLinks.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className="font-baloo rounded-full border border-border/60 bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted-bg dark:border-white/10 dark:bg-card/90 dark:hover:bg-muted-bg"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <MobileBottomNav embedded />
      </div>
    );
  }
}
