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

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const isMaintenancePage = pathname === "/maintenance";
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <FirebaseSessionProvider>
      <BrandContextProvider>
        <SocketSessionWrapper>
          {!isMaintenancePage && !isAdmin && <Navbar />}
          {!isMaintenancePage && isAdmin && <AdminNavbar />}
          <div className={isAdmin ? "pt-14" : ""}>{children}</div>
          {!isMaintenancePage && !isAdmin && <GlobalMessages />}
        </SocketSessionWrapper>
      </BrandContextProvider>
    </FirebaseSessionProvider>
  );

  function SocketSessionWrapper({ children }) {
    const { user, loading } = useFirebaseSession();
    if (loading) {
      return <Loader loadingMessage="Loading Session..." />;
    }
    return <SocketProvider userId={user?.id}>{children}</SocketProvider>;
  }
}
