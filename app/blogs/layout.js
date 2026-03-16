"use client";

import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function BlogsLayout({ children }) {
  const brandContext = useBrandContext();
  const router = useRouter();

  if (!brandContext?.enableBlogs) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-gray-600 mb-4">Blog is not enabled for this brand.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg bg-[#2D545E] text-white hover:bg-[#264850] transition-colors"
          >
            Go to home
          </button>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen bg-white">{children}</div>;
}
