"use client";
import "./globals.css";
import SocketProvider from "./context/SocketProvider";
import {
  FirebaseSessionProvider,
  useFirebaseSession,
} from "./lib/firebase/FirebaseSessionProvider";
import BrandContextProvider from "./context/brand/BrandContextProvider";
import Navbar from "@/app/components/Navbar";
import Loader from "./components/Loader";
import DynamicMetaTags from "./components/DynamicMetaTags";
import { usePathname } from "next/navigation";
import AdminNavbar from "./admin/components/AdminNavbar";
import {
  Zen_Dots,
  Akshar,
  Baloo_2,
  Commissioner,
  Fredoka,
  Figtree,
  Dosis,
} from "next/font/google";

const zenDots = Zen_Dots({
  subsets: ["latin"],
  weight: "400", // Zen Dots has ONLY one weight
  variable: "--font-zen-dots",
});
const dosis = Dosis({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-dosis",
});
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-figtree",
});
const akshar = Akshar({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-akshar",
});

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-baloo",
});

const commissioner = Commissioner({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-commissioner",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
});

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isMaintenancePage = pathname === "/maintenance";
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <html
      lang="en"
      className={`${zenDots.variable} 
      ${akshar.variable} ${baloo.variable}
       ${commissioner.variable} 
       ${fredoka.variable} ${figtree.variable}
       ${dosis.variable}`}
    >
      <head>
        <title>Kavisha.ai</title>
        <link rel="icon" href="data:," />
      </head>
      <body
        className="h-full"
        suppressHydrationWarning={true}
        suppressContentEditableWarning={true}
      >
        <FirebaseSessionProvider>
          <BrandContextProvider>
            <DynamicMetaTags />
            <SocketSessionWrapper>
              {!isMaintenancePage && !isAdmin && <Navbar />}
              {!isMaintenancePage && isAdmin && <AdminNavbar />}
              <div className={isAdmin ? "pt-14" : ""}>{children}</div>
            </SocketSessionWrapper>
          </BrandContextProvider>
        </FirebaseSessionProvider>
      </body>
    </html>
  );

  function SocketSessionWrapper({ children }) {
    const { user, loading } = useFirebaseSession();
    if (loading) {
      return <Loader loadingMessage="Loading Session..." />;
    }
    return <SocketProvider userId={user?.id}>{children}</SocketProvider>;
  }
}
