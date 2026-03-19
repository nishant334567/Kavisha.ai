"use client";

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
import { CartContextProvider } from "../context/cart/CartContextProvider"

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
                  ? `pt-0 md:pt-14 ${!isAdmin ? "pb-[4.5rem] md:pb-0" : ""}`
                  : ""
              }
            >
              {children}
            </div>
            {!isMaintenancePage && !isAdmin && <MobileBottomNav />}
            {!isMaintenancePage && !isAdmin && pathname !== "/" && <GlobalMessages />}
          </SocketSessionWrapper>
        </CartContextProvider>
      </BrandContextProvider>
    </FirebaseSessionProvider>
  );

  function SocketSessionWrapper({ children, isAdmin }) {
    const { user, loading } = useFirebaseSession();
    const shellClass = isAdmin ? "min-h-screen" : "font-baloo min-h-screen";
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
