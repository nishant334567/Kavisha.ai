"use client";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import SocketProvider from "./context/SocketProvider";
import { useSession } from "next-auth/react";
import BrandContextProvider from "./context/brand/BrandContextProvider";
import Navbar from "@/app/components/Navbar";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <title>Kavisha.ai</title>
        <link rel="icon" href="data:," />
      </head>
      <body
        className="h-screen overflow-hidden"
        suppressHydrationWarning={true}
      >
        <SessionProvider>
          <BrandContextProvider>
            <SocketSessionWrapper>
              <Navbar />
              <div className="pt-14 min-h-[calc(100vh-56px)]">{children}</div>
            </SocketSessionWrapper>
          </BrandContextProvider>
        </SessionProvider>
      </body>
    </html>
  );

  function SocketSessionWrapper({ children }) {
    const { data: session, status } = useSession();
    if (status === "loading") return null;
    return (
      <SocketProvider userId={session?.user?.id}>{children}</SocketProvider>
    );
  }
}
