"use client";
import { signIn } from "@/app/lib/firebase/sign-in";
import { useFirebaseSession } from "../../lib/firebase/FirebaseSessionProvider";
import { signOut } from "../../lib/firebase/logout";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { User, Settings, Menu } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
export default function AdminNavbar() {
  const { user, loading } = useFirebaseSession();
  const router = useRouter();
  const brand = useBrandContext();
  const pathname = usePathname();
  const go = (path) => router.push(path);
  const [showNavoption, setShowNavoption] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 w-full h-14 bg-gray-800 z-50">
        <div className="px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-purple-300 stroke-2" />
            <button
              onClick={() => go(`/admin/${brand?.subdomain}/v2`)}
              className="text-white uppercase tracking-wide text-xs hover:opacity-80 transition-opacity"
            >
              Home
            </button>
          </div>
          <button onClick={() => setShowNavoption(true)}>
            <Menu className="w-5 h-5 text-white sm:hidden" />
          </button>
          <ul className="items-center gap-6 text-xs hidden sm:flex">
            <li
              className={`cursor-pointer text-white uppercase tracking-wide ${
                pathname?.includes("/my-services") ? "font-semibold" : ""
              }`}
              onClick={() => go(`/admin/${brand?.subdomain}/my-services`)}
            >
              MY SERVICES
            </li>
            <li
              className={`cursor-pointer text-white uppercase tracking-wide ${
                pathname?.includes("/train") ? "font-semibold" : ""
              }`}
              onClick={() => go(`/admin/${brand?.subdomain}/train`)}
            >
              TRAIN MY AVATAAR
            </li>
            <li
              className={`cursor-pointer text-white uppercase tracking-wide flex items-center gap-2 ${
                pathname?.includes("/edit-profile") ? "font-semibold" : ""
              }`}
              onClick={() => go(`/admin/${brand?.subdomain}/edit-profile`)}
            >
              MY PROFILE
              <Settings className="w-4 h-4 text-purple-300 stroke-2" />
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
