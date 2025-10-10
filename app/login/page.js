"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session } = useSession();
  const brand = useBrandContext();
  const router = useRouter();
  return (
    <div className="h-full overflow-y-auto mx-auto w-full lg:max-w-[60%] px-8 py-8 space-y-8">
      <div className="mt-4 h-48 sm:h-80 w-full  rounded-xl">
        <img
          src={brand?.brandImageUrl}
          alt={brand?.brandName || "Brand"}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="text-center mx-auto max-w-4xl">
        <p className="text-2xl sm:text-4xl lg:text-6xl font-bold my-2">
          {brand?.title}
        </p>
        <p className="text-gray-500 text-sm sm:text-base leading-relaxed px-4">
          {brand?.subtitle}
        </p>
      </div>

      <div className="flex justify-center pb-8">
        <button
          onClick={() => {
            !session?.user?.id
              ? signIn("google", { callbackUrl: "/" })
              : router.push("/");
          }}
          className="px-6 py-3 bg-sky-700 text-white rounded-md text-lg font-medium"
        >
          {session?.user?.id ? "Go to Homepage" : brand?.loginButtonText}
        </button>
      </div>
    </div>
  );
}
