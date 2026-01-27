"use client";
import Link from "next/link";
import { Twitter, Linkedin } from "lucide-react";

export default function Footer() {
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
                <Link href="/about" className="hover:underline">
                  About
                </Link>
              </li>
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
                <Link href="/copyright" className="hover:underline">
                  Copyright
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
                <Link href="/make-avatar/v2" className="hover:underline">
                  Make my Avataar
                </Link>
              </li>
              <li>
                <Link href="/talk-to-avatar" className="hover:underline">
                  Talk to Avataars
                </Link>
              </li>
              <li>
                <Link href="/connect" className="hover:underline">
                  Connect with people
                </Link>
              </li>
            </ul>
          </div>

          {/* Right Column - Social Media (positioned further right) */}
          <div className="md:ml-auto">
            <ul className="space-y-3 font-normal">
              <li>
                <a
                  href="https://twitter.com/kavishaai"
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
                  href="https://linkedin.com/company/kavishaai"
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
