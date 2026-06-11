"use client";

import { useEffect } from "react";
import SocketProvider from "../context/SocketProvider";
import {
  FirebaseSessionProvider,
  useFirebaseSession,
} from "../lib/firebase/FirebaseSessionProvider";
import BrandContextProvider from "../context/brand/BrandContextProvider";
import Navbar from "./Navbar";
import Loader from "./Loader";
import { usePathname } from "next/navigation";
import AdminNavbar from "../admin/components/AdminNavbar";
import GlobalMessages from "./GlobalMessages";
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
  const isChatThread =
    /^\/chats\/[^/]+/.test(pathname || "") ||
    /^\/community\/[^/]+/.test(pathname || "");

  const mainPadding = !isMaintenancePage
    ? isAdmin
      ? "pt-14"
      : isChatThread
        ? "pt-0 md:pt-14"
        : "pt-0 md:pt-14 pb-[4.5rem] md:pb-0"
    : "";

  const showGlobalMessages =
    !isMaintenancePage && !isAdmin && pathname !== "/";

  return (
    <FirebaseSessionProvider>
      <BrandContextProvider>
        <CartContextProvider>
          <SocketSessionWrapper isAdmin={isAdmin}>
            <GlobalMessages enabled={showGlobalMessages}>
              {!isMaintenancePage && !isAdmin && <Navbar />}
              {!isMaintenancePage && isAdmin && <AdminNavbar />}
              <div className={mainPadding}>
                {children}
              </div>
              {!isMaintenancePage && !isAdmin && <MobileBottomNav />}
            </GlobalMessages>
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

}
