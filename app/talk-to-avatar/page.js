"use client";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Loader from "../components/Loader";
import AvatarCard from "../components/AvatarCard";
import { ArrowLeft } from "lucide-react";

export default function TalkToAvatarPage() {
  const { user, loading: sessionLoading } = useFirebaseSession();
  const brandContext = useBrandContext();
  const router = useRouter();
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Only allow access for kavisha brand - redirect if not kavisha
  useEffect(() => {
    if (brandContext && brandContext.subdomain !== "kavisha") {
      router.push("/");
    }
  }, [brandContext, router]);

  // Redirect if user is not logged in
  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push("/");
    }
  }, [sessionLoading, user, router]);

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/brands");
        if (!res.ok) {
          throw new Error("Failed to fetch avatars");
        }
        const data = await res.json();
        setAvatars(data.brands || []);
      } catch (err) {
        console.error("Error fetching avatars:", err);
        setError(err.message || "Failed to load avatars");
      } finally {
        setLoading(false);
      }
    };

    if (!sessionLoading && brandContext && brandContext.subdomain === "kavisha" && user) {
      fetchAvatars();
    }
  }, [sessionLoading, brandContext, user]);

  if (sessionLoading || !brandContext) {
    return <Loader loadingMessage="Loading..." />;
  }

  // Show loader if redirecting
  if (brandContext.subdomain !== "kavisha" || !user) {
    return <Loader loadingMessage="Redirecting..." />;
  }

  return (
    <div className="min-h-screen from-[#F9F9F9] to-[#EDF4F7] pt-8">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="mb-8 md:mb-12 mt-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-[#3D5E6B] hover:text-[#2d4752] transition-colors mb-6 font-akshar"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="text-center mb-6">
            <div className="flex flex-col items-center justify-center">
              <img src="/kavisha-logo.png" width={150} height={150} alt="Kavisha" />
            </div>
            <h1 className="text-6xl font-fredoka text-[#3D5E6B] my-4">
              Talk to <span className="text-[#00B5BD]">Avataars</span>
            </h1>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto font-fredoka leading-relaxed">
              Talk to leaders in the world of business, finance, art and academia. Interact, learn and grow. Also, connect with other fans while you’re at it.
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (

          <Loader loadingMessage="Loading avatars..." />

        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 text-white rounded-lg transition-colors font-akshar"
            >
              Retry
            </button>
          </div>
        ) : avatars.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg">No avatars available at the moment.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-fredoka text-[#264653]">
                All Avataars
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-8 justify-items-center sm:justify-items-stretch px-8">
              {avatars.map((avatar) => (
                <a
                  key={avatar.id}
                  href={avatar.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 rounded-2xl focus:outline-none h-full w-full max-w-sm sm:max-w-none"
                >
                  <AvatarCard
                    image={avatar.image}
                    name={avatar.name}
                    title={avatar.title}
                    subtitle={avatar.subtitle}
                  />
                </a>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-16 md:mt-20 text-center">
          <p className="text-gray-600 font-assistant">
            Powered by <span className="font-semibold text-[#3D5E6B]">KAVISHA</span>
          </p>
        </div>
      </div>
    </div>
  );
}
