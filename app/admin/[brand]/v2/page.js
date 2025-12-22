"use client";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
export default function AdminHome() {
  const router = useRouter();
  const brand = useBrandContext();
  const go = (path) => router.push(path);
  return (
    <>
      <div className="bg-gray-100 h-[calc(100vh-56px)]  flex flex-col items-center justify-center overflow-hidden">
        <p className="font-bold text-gray-900 text-5xl md:text-6xl px-4">
          Welcome, {brand?.brandName} !
        </p>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => go(`/admin/${brand?.subdomain}/chat-requests`)}
            className="px-4 py-2 text-gray-800 rounded-lg border border-gray-300 bg-transparent mr-2"
          >
            Chat Requests
          </button>
          <button
            onClick={() => go(`/admin/${brand?.subdomain}/my-community`)}
            className="px-4 py-2 text-gray-800 rounded-lg border border-gray-300 bg-transparent mr-2"
          >
            Your Community
          </button>
        </div>
      </div>
    </>
  );
}
