"use client";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import { signIn } from "../lib/firebase/sign-in";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { useState } from "react";

export default function AvatarHomepage() {
  const brand = useBrandContext();
  const router = useRouter();
  const { refresh } = useFirebaseSession();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    setSigningIn(true);
    setError("");
    try {
      await signIn();
      await refresh();
      // Force a hard refresh to ensure state is updated
      // window.location.href = "/";
    } catch (e) {
      setError(e.message || "Sign in failed");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="md:mt-12 h-full overflow-y-auto mx-auto w-full md:max-w-[60%] md:px-8 py-8 space-y-6">
      <div className="md:hidden flex gap-4 my-2 px-4">
        <img
          src={brand?.logoUrl}
          className="rounded-full w-10 h-10 object-cover"
          alt={brand?.brandName}
        />
        <div className="flex justify-center items-center">
          <p className="font-akshar font-medium">
            {brand?.brandName?.toUpperCase()}
          </p>
        </div>
      </div>

      {brand?.brandImageUrl && (
        <img
          src={brand.brandImageUrl}
          alt={brand?.brandName?.toUpperCase() || "Brand"}
          className="w-full h-full object-cover rounded-lg"
        />
      )}

      <div className="text-center mx-auto max-w-4xl px-4">
        <p className="font-fredoka font-normal text-3xl my-2 mb-4">
          {brand?.title}
        </p>
        <p className="font-fredoka leading-relaxed px-4">{brand?.subtitle}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg max-w-md mx-auto text-sm text-center">
          {error}
        </div>
      )}

      <div className="flex justify-center pb-8">
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="font-akshar px-6 py-3 rounded-full bg-[#59646F] text-md disabled:opacity-50 flex items-center gap-2 text-[#FFEED8] hover:bg-[#4a5568] transition-colors my-4"
        >
          {signingIn ? (
            <span>Signing in...</span>
          ) : (
            brand?.loginButtonText?.toUpperCase() || "TALK TO ME NOW"
          )}
        </button>
      </div>
    </div>
  );
}
