"use client";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <title>Kavisha.ai</title>
      </head>
      <body className="bg-gray-400">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
