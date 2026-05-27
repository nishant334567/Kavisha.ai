"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import Loader from "@/app/components/Loader";
import BrandHeroImageFrame from "@/app/components/BrandHeroImageFrame";
import BrandActivatedServices from "@/app/admin/components/BrandActivatedServices";
import BrandChatServicesSection from "@/app/admin/components/BrandChatServicesSection";
import { getBrandOrigin } from "@/app/lib/kavishaSiteEnv";

const PLATFORM = "kavisha";

function BrandLogo({ brand, large = false }) {
  const src = brand?.logo || brand?.image;
  const size = large ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${size} shrink-0 rounded-full object-cover ring-1 ring-border`}
      />
    );
  }

  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-[#2D545E] font-bold text-white`}
    >
      {brand?.name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

export default function PlatformAdminPage() {
  const router = useRouter();
  const brandContext = useBrandContext();
  const subdomain = brandContext?.subdomain || "";

  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [selectedSubdomain, setSelectedSubdomain] = useState(null);
  const [brandDetail, setBrandDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!brandContext) return;
    if (subdomain !== PLATFORM) {
      router.replace(`/admin/${subdomain}/v2`);
    }
  }, [brandContext, subdomain, router]);

  useEffect(() => {
    if (subdomain !== PLATFORM) return;

    let cancelled = false;
    (async () => {
      setLoadingBrands(true);
      try {
        const res = await fetch("/api/brands");
        const data = res.ok ? await res.json() : { brands: [] };
        const list = data.brands || [];
        if (!cancelled) {
          setBrands(list);
          if (list.length > 0) {
            setSelectedSubdomain((prev) => prev ?? list[0].subdomain);
          }
        }
      } catch {
        if (!cancelled) setBrands([]);
      } finally {
        if (!cancelled) setLoadingBrands(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [subdomain]);

  useEffect(() => {
    if (!selectedSubdomain || subdomain !== PLATFORM) {
      setBrandDetail(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      try {
        const res = await fetch(
          `/api/public/brand-context?subdomain=${encodeURIComponent(selectedSubdomain)}`,
        );
        const data = res.ok ? await res.json() : null;
        if (!cancelled) setBrandDetail(data);
      } catch {
        if (!cancelled) setBrandDetail(null);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSubdomain, subdomain]);

  if (!brandContext || subdomain !== PLATFORM) {
    return <Loader loadingMessage="Loading..." />;
  }

  const selected =
    brands.find((b) => b.subdomain === selectedSubdomain) || brands[0] || null;

  const talkToAvatarPublished =
    brandDetail != null
      ? brandDetail.talkToAvatarPublished !== false
      : selected?.talkToAvatarPublished !== false;

  const setBrandPublishState = (targetSubdomain, published) => {
    setBrands((prev) =>
      prev.map((b) =>
        b.subdomain === targetSubdomain
          ? { ...b, talkToAvatarPublished: published }
          : b,
      ),
    );
    setBrandDetail((prev) =>
      prev ? { ...prev, talkToAvatarPublished: published } : prev,
    );
  };

  const toggleTalkToAvatarPublish = async () => {
    if (!selectedSubdomain || publishing) return;

    const nextPublished = !talkToAvatarPublished;
    setPublishing(true);
    try {
      const res = await fetch(
        `/api/admin/platform/brands/${encodeURIComponent(selectedSubdomain)}/publish`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published: nextPublished }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to update publish status");
      }
      setBrandPublishState(selectedSubdomain, nextPublished);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update publish status");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="mx-auto box-border flex h-[calc(100vh-3.5rem)] min-h-0 max-w-6xl flex-col overflow-hidden px-4 py-4 md:flex-row md:gap-6">
      <aside className="flex min-h-0 shrink-0 flex-col overflow-hidden max-md:max-h-[40vh] md:h-full md:w-56 md:border-r md:border-border md:pr-4">
        <p className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-foreground">
          Brands
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
          {loadingBrands ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : brands.length === 0 ? (
            <p className="text-sm text-muted">No brands yet.</p>
          ) : (
            <ul>
              {brands.map((b) => {
                const active = selected?.subdomain === b.subdomain;
                return (
                  <li key={b.subdomain}>
                    <button
                      type="button"
                      onClick={() => setSelectedSubdomain(b.subdomain)}
                      className={`flex w-full items-center gap-2 px-2 py-2 text-left text-sm ${active ? "bg-muted-bg font-medium" : "hover:bg-muted-bg/60"
                        }`}
                    >
                      <BrandLogo brand={b} />
                      <span className="min-w-0 flex-1 truncate">{b.name}</span>
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${b.talkToAvatarPublished !== false
                            ? "bg-emerald-500"
                            : "bg-amber-400"
                          }`}
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto scrollbar-none pt-4 md:pt-0">
        {!selected ? (
          <p className="text-sm text-muted">Select a brand.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <BrandLogo brand={selected} large />
                <h1 className="font-baloo text-lg font-bold text-foreground">
                  {selected.name}
                </h1>
                <a
                  href={`${getBrandOrigin(selected.subdomain)}/admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-colors hover:bg-neutral-800"
                >
                  Admin access
                </a>
              </div>
              <button
                type="button"
                onClick={toggleTalkToAvatarPublish}
                disabled={publishing || loadingDetail}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-60"
              >
                <span
                  className={`h-2 w-2 rounded-full ${talkToAvatarPublished ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                  aria-hidden
                />
                {talkToAvatarPublished ? "Published" : "Unpublished"}
              </button>
            </div>

            {brandDetail?.brandImageUrl ? (
              <div className="mb-4 overflow-hidden rounded-lg border border-border">
                <BrandHeroImageFrame
                  imageUrl={brandDetail.brandImageUrl}
                  alt={selected.name}
                  zoom={brandDetail.brandHeroZoom}
                  focusX={brandDetail.brandHeroFocusX}
                  focusY={brandDetail.brandHeroFocusY}
                />
              </div>
            ) : null}

            {selected.title ? (
              <p className="text-base font-semibold text-foreground">
                {selected.title}
              </p>
            ) : null}
            {selected.subtitle ? (
              <p className="mt-1 text-sm text-muted">{selected.subtitle}</p>
            ) : null}

            {loadingDetail ? (
              <p className="mt-6 text-sm text-muted">Loading services…</p>
            ) : (
              <>
                <BrandActivatedServices
                  brandName={selected.name}
                  brandDetail={brandDetail}
                />
                <BrandChatServicesSection brandDetail={brandDetail} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
