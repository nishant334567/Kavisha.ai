"use client";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { signIn } from "../lib/firebase/sign-in";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import {
  detectInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "../lib/in-app-browser";

export default function LoginPage() {
  const { user, loading, refresh } = useFirebaseSession();
  const brand = useBrandContext();
  const router = useRouter();
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");
  const [popupBlocked, setPopupBlocked] = useState(false);

  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    if (user && !loading) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError("");
    setPopupBlocked(false);
    try {
      await signIn();
      await refresh();
      // The useEffect will handle redirect when user state updates
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

  const isBlocked = isInAppBrowser && isMobile;
  const shouldShowGoogleLogin = !isBlocked && !user && !loading;

  // Show loader while checking session
  if (loading) {
    return <Loader loadingMessage="Checking Session..." />;
  }

  return (
    <div className="md:mt-12 h-full overflow-y-auto mx-auto w-full md:max-w-[60%] md:px-8 py-8 space-y-6">
      {/* <div className="mt-8 w-full aspect-[3/1] rounded-lg shadow-lg overflow-hidden"> */}

      <div className="md:hidden flex gap-4 my-2 px-4">
        <img
          src={brand?.logoUrl}
          className="rounded-full w-10 h-10 object-cover"
        />
        <div className="flex justify-center items-center">
          <p className="font-akshar font-medium">
            {brand.brandName?.toUpperCase()}
          </p>
        </div>
      </div>
      <img
        src={brand?.brandImageUrl}
        alt={brand?.brandName?.toUpperCase() || "Brand"}
        className="w-full h-full object-cover"
      />
      {/* </div> */}

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

      {popupBlocked && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg max-w-md mx-auto text-sm text-center">
          Popup was blocked. Try again — it&apos;ll work.
        </div>
      )}

      {isBlocked && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg max-w-md mx-auto">
          <p className="text-sm text-gray-700 mb-4 text-center">
            Please open in Chrome to continue
          </p>
          <button
            onClick={openInChrome}
            className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Open in Chrome
          </button>
        </div>
      )}

      <div className="flex justify-center pb-8">
        {shouldShowGoogleLogin && (
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="font-akshar px-6 py-3 rounded-full bg-[#59646F] text-md disabled:opacity-50 flex items-center gap-2 text-[#FFEED8] hover:bg-[#4a5568] transition-colors my-4"
          >
            {signingIn ? (
              <span>Signing in...</span>
            ) : (
              brand?.loginButtonText?.toUpperCase() || "Talk to Kavisha now"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
