"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { signIn } from "../lib/firebase/sign-in";
import { Twitter, Linkedin } from "lucide-react";

export default function Footer() {
  const router = useRouter();
  const { user, refresh } = useFirebaseSession();

  const handleSignIn = async (redirectPath) => {
    try {
      if (redirectPath && typeof window !== "undefined") {
        const path = typeof redirectPath === "string" && redirectPath.startsWith("/") ? redirectPath : "/";
        localStorage.setItem("redirectAfterLogin", path);
      }
      await signIn();
      await refresh();
    } catch (e) {
      // popup blocked etc. – user can retry
    }
  };

  const authLink = (href, label) =>
    user ? (
      <Link href={href} className="hover:underline">
        {label}
      </Link>
    ) : (
      <button
        type="button"
        onClick={() => handleSignIn(href)}
        className="hover:underline text-left font-normal bg-transparent border-0 p-0 cursor-pointer font-fredoka"
      >
        {label}
      </button>
    );

  return (
    <footer className="bg-[#F9F9F9] py-12 px-4 font-fredoka border-t border-gray-200">
      <div className="max-w-6xl mx-auto">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          {/* Left Column - Kavisha */}
          <div>
            <h3 className="font-medium mb-4">Kavisha</h3>
            <ul className="space-y-2 font-normal">

              <li>
                <Link href="/tnc" className="hover:underline">
                  Terms and conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:underline">
                  Privacy policy
                </Link>
              </li>

              <li>
                <Link href="/help" className="hover:underline">
                  Help
                </Link>
              </li>
            </ul>
          </div>

          {/* Middle Column - Features */}
          <div>
            <h3 className="font-medium mb-4">Features</h3>
            <ul className="space-y-2 font-normal">
              <li>
                <Link href="/make-avatar" className="hover:underline">
                  Make my Avataar
                </Link>
              </li>
              <li>
                {authLink("/talk-to-avatar", "Talk to Avataars")}
              </li>

            </ul>
          </div>

          {/* Right Column - Social Media (positioned further right) */}
          <div className="md:ml-auto">
            <ul className="space-y-3 font-normal">
              <li>
                <a
                  href="https://x.com/kavishaai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:underline"
                >
                  <Twitter className="w-5 h-5" />
                  <span>Twitter</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/company/kavisha-ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:underline"
                >
                  <Linkedin className="w-5 h-5" />
                  <span>LinkedIn</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center pt-8 border-t border-gray-200">
          <p className="font-normal text-gray-600">
            Copyright © 2026 Kavisha. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
