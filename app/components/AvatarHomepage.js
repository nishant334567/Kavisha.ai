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
  const [popupBlocked, setPopupBlocked] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError("");
    setPopupBlocked(false);
    try {
      await signIn();
      await refresh();
      // Force a hard refresh to ensure state is updated
      // window.location.href = "/";
    } catch (e) {
      if (e?.code === "auth/popup-blocked") {
        setPopupBlocked(true);
      } else {
        setError(e.message || "Sign in failed");
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="md:mt-12 flex-1 overflow-y-auto mx-auto w-full md:max-w-[60%] md:px-8 pt-2 space-y-4 pb-8 md:pb-24">
        <div className="md:hidden flex gap-4 my-2 px-4">
          <img
            src={brand?.logoUrl}
            className="rounded-full w-10 h-10 object-cover"
            alt={brand?.brandName}
          />
          <div className="flex justify-center items-center">
            <p className="font-akshar font-medium text-foreground">
              {brand?.brandName?.toUpperCase()}
            </p>
          </div>
        </div>

        {brand?.brandImageUrl && (
          <img
            src={brand.brandImageUrl}
            alt={brand?.brandName?.toUpperCase() || "Brand"}
            className="w-full md:max-h-[50vh] object-cover md:rounded-lg"
          />
        )}

        <div className="text-center mx-auto max-w-4xl px-4">
          <p className="font-fredoka font-normal text-3xl my-2 mb-4 text-foreground">
            {brand?.title}
          </p>
          <p className="font-fredoka leading-relaxed px-4 text-foreground">
            {brand?.subtitle}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg max-w-md mx-auto text-sm text-center">
            {error}
          </div>
        )}

        {popupBlocked && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg max-w-md mx-auto text-sm text-center">
            Popup was blocked. Click Sign in again — it&apos;ll work.
          </div>
        )}

        {/* Button in normal flow for both mobile and desktop */}
        <div className="flex justify-center py-6">
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="font-akshar px-6 py-3 rounded-full bg-[#59646F] dark:bg-muted-bg text-md disabled:opacity-50 flex items-center gap-2 text-[#FFEED8] dark:text-foreground hover:bg-[#4a5568] dark:hover:bg-border transition-colors"
          >
            {signingIn ? (
              <span>Signing in...</span>
            ) : (
              brand?.loginButtonText?.toUpperCase() || "TALK TO ME NOW"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
