"use client";

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
import GlobalMessages from "./GlobalMessages";
import MobileBottomNav from "./MobileBottomNav";
import { CartContextProvider } from "../context/cart/CartContextProvider";

const LIGHT_CHAT_GRADIENT =
  "linear-gradient(to right, #DBF8F8 0%, #DBF3F8 50%, #DBEEF8 100%)";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const isMaintenancePage = pathname === "/maintenance";
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <FirebaseSessionProvider>
      <BrandContextProvider>
        <CartContextProvider>
          <SocketSessionWrapper isAdmin={isAdmin}>
            {!isMaintenancePage && !isAdmin && <Navbar />}
            {!isMaintenancePage && isAdmin && <AdminNavbar />}
            <div
              className={
                !isMaintenancePage
                  ? `pt-0 md:pt-14 ${
                      !isAdmin
                        ? pathname === "/"
                          ? "pb-32 md:pb-0"
                          : "pb-[4.5rem] md:pb-0"
                        : ""
                    }`
                  : ""
              }
            >
              {children}
            </div>
            {!isMaintenancePage && !isAdmin && <MobileBottomArea />}
            {!isMaintenancePage && !isAdmin && pathname !== "/" && <GlobalMessages />}
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
      { label: "LINKS", path: `/links${linksQs}` },
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
                className="font-baloo rounded-full px-3 py-2 text-sm font-medium text-[#1f2937] shadow-sm transition-opacity hover:opacity-90 dark:text-[#0f172a]"
                style={{ background: LIGHT_CHAT_GRADIENT }}
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
