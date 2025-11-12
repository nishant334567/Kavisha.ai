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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
            <SocketSessionWrapper>
              <Navbar />
              <div className="mt-12 min-h-[calc(100vh-56px)]">{children}</div>
            </SocketSessionWrapper>
          </BrandContextProvider>
        </FirebaseSessionProvider>
      </body>
    </html>
  );

  function SocketSessionWrapper({ children }) {
    const { user, loading } = useFirebaseSession();
    if (loading) {
      return <Loader loadingMessage="Loading session..." />;
    }
    return <SocketProvider userId={user?.id}>{children}</SocketProvider>;
  }
}
