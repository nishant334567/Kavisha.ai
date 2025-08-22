"use client";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import SocketProvider from "./context/SocketProvider";
import { useSession } from "next-auth/react";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <title>Kavisha.ai</title>
        <link rel="icon" href="data:," />
      </head>
      <body className="bg-slate-50" suppressHydrationWarning={true}>
        <SessionProvider>
          <SocketSessionWrapper>{children}</SocketSessionWrapper>
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
