"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import Loader from "@/app/components/Loader";
import {
  ArrowRight,
  Check,
  Copy,
  Globe,
  LayoutDashboard,
  Loader2,
  Package,
  Sparkles,
} from "lucide-react";

const POLL_MS = 20_000;

function adminHref(subdomain, segment) {
  const s = encodeURIComponent(subdomain);
  return `/admin/${s}/${segment}?subdomain=${s}`;
}

function mappedDomainName(subdomain, domainFromQuery) {
  if (domainFromQuery) return domainFromQuery;
  if (!subdomain) return "";
  if (typeof window === "undefined") return `${subdomain}.kavisha.ai`;
  const onStaging = window.location.hostname.includes(".staging.");
  return onStaging
    ? `${subdomain}.staging.kavisha.ai`
    : `${subdomain}.kavisha.ai`;
}

function brandHomeUrl(subdomain, domainReady) {
  if (typeof window === "undefined") return "/";
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${origin}/?subdomain=${encodeURIComponent(subdomain)}`;
  }
  const onStaging = hostname.includes(".staging.");
  if (domainReady) {
    return onStaging
      ? `https://${subdomain}.staging.kavisha.ai`
      : `https://${subdomain}.kavisha.ai`;
  }
  const apex = onStaging ? "https://kavisha.staging.kavisha.ai" : "https://kavisha.ai";
  return `${apex}/?subdomain=${encodeURIComponent(subdomain)}`;
}

function embedSnippet(subdomain) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://kavisha.ai";
  return `<script src="${origin}/embed.js" data-brand="${subdomain}"></script>`;
}

function welcomeReturnUrl(subdomain, shop) {
  const q = new URLSearchParams({ subdomain });
  if (shop) q.set("shop", shop);
  return `/admin/${encodeURIComponent(subdomain)}/welcome?${q}`;
}

function personalDomainUrl(domain) {
  return domain ? `https://${domain}` : "";
}

const DOMAIN_READY_ETA = "15–30 minutes";

function DomainMappingBanner({
  mappedDomain,
  domainStatus,
  domainUrlCopied,
  onCopyDomainUrl,
  onEditProfile,
  showProfileNudge,
}) {
  if (!mappedDomain) return null;

  const url = personalDomainUrl(mappedDomain);
  const ready = domainStatus === "ready";
  const failed = domainStatus === "failed";
  const pending = !ready && !failed;

  return (
    <section
      className={`mb-8 rounded-2xl border px-5 py-5 md:px-6 ${ready
          ? "border-emerald-500/25 bg-emerald-500/5"
          : failed
            ? "border-red-500/25 bg-red-500/5"
            : "border-border bg-card"
        }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ready
                  ? "bg-emerald-500/15 text-emerald-600"
                  : failed
                    ? "bg-red-500/10 text-red-600"
                    : "bg-highlight/10 text-highlight"
                }`}
            >
              {ready ? (
                <Check className="h-4 w-4" />
              ) : pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-foreground">
                {ready
                  ? "Your personal domain is live"
                  : failed
                    ? "We couldn’t finish your domain setup"
                    : "Your personal domain is being mapped"}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {ready ? (
                  <>
                    Visitors can reach you at{" "}
                    <span className="font-medium text-foreground">{mappedDomain}</span>.
                  </>
                ) : failed ? (
                  <>
                    <span className="font-medium text-foreground">{mappedDomain}</span>{" "}
                    didn’t connect. Email support if this persists.
                  </>
                ) : (
                  <>
                    <span className="font-medium text-foreground">{mappedDomain}</span>{" "}
                    is being pointed to your avatar. It’s usually ready within{" "}
                    <span className="text-foreground">{DOMAIN_READY_ETA}</span> — you can
                    finish the steps below while you wait.
                  </>
                )}
              </p>
              {showProfileNudge && pending ? (
                <p className="mt-3 text-sm text-muted">
                  <span className="text-foreground">Tip:</span> complete your profile now
                  so your homepage looks polished when the domain goes live.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
          <button
            type="button"
            onClick={onCopyDomainUrl}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted-bg"
          >
            {domainUrlCopied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy URL
              </>
            )}
          </button>
          {ready ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Open site
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : showProfileNudge ? (
            <button
              type="button"
              onClick={onEditProfile}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Complete profile
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      {pending ? (
        <p className="mt-4 truncate rounded-lg bg-muted-bg/60 px-3 py-2 text-center font-mono text-xs text-muted sm:text-left">
          {url}
        </p>
      ) : null}
    </section>
  );
}

function StepCard({ step, title, description, action, secondaryAction, children }) {
  return (
    <li className="flex h-full flex-col rounded-xl border border-border bg-card p-5 md:p-6">
      <p className="mb-1 text-xs font-medium text-muted">Step {step}</p>
      <h2 className="mb-2 font-medium text-foreground">{title}</h2>
      <p className="flex-1 text-sm text-muted">{description}</p>
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {action}
        {secondaryAction}
      </div>
    </li>
  );
}

export default function AvatarWelcomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brand = useBrandContext();
  const { user, loading: authLoading } = useFirebaseSession();
  const [embedCopied, setEmbedCopied] = useState(false);
  const [domainUrlCopied, setDomainUrlCopied] = useState(false);
  const [domainStatus, setDomainStatus] = useState("pending");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [shopifyApiConnected, setShopifyApiConnected] = useState(false);
  const claimStarted = useRef(false);

  const subdomain = brand?.subdomain || searchParams.get("subdomain") || "";
  const displayName = brand?.brandName || subdomain || "Your avatar";
  const shop = searchParams.get("shop") || brand?.shopifyShopUrl || "";
  const isAdmin = Boolean(brand?.isBrandAdmin);

  const mappedDomain = useMemo(
    () => mappedDomainName(subdomain, searchParams.get("domain")),
    [subdomain, searchParams]
  );
  const domainLive = domainStatus === "ready";
  const homeUrl = useMemo(
    () => (subdomain ? brandHomeUrl(subdomain, domainLive) : "/"),
    [subdomain, domainLive]
  );
  const hasShopify = Boolean(String(brand?.shopifyShopUrl || "").trim());
  const showShopifyProducts = hasShopify && shopifyApiConnected;

  useEffect(() => {
    if (!isAdmin || !subdomain || !hasShopify) {
      setShopifyApiConnected(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/shopify-shop?brand=${encodeURIComponent(subdomain)}`,
          { credentials: "same-origin" }
        );
        const data = res.ok ? await res.json() : {};
        if (!cancelled) setShopifyApiConnected(Boolean(data.connected));
      } catch {
        if (!cancelled) setShopifyApiConnected(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, subdomain, hasShopify]);

  const embedCode = useMemo(
    () => (subdomain ? embedSnippet(subdomain) : ""),
    [subdomain]
  );

  const runClaim = useCallback(async () => {
    if (!subdomain || claiming) return;
    setClaiming(true);
    setClaimError("");
    try {
      const res = await fetch("/api/shopify/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain, shop }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not claim avatar.");
      window.location.assign(welcomeReturnUrl(subdomain, shop));
    } catch (e) {
      setClaimError(e?.message || "Could not claim avatar.");
      setClaiming(false);
    }
  }, [subdomain, shop, claiming]);

  const handleClaimClick = () => {
    if (!subdomain) return;
    if (!user) {
      const returnTo = `${welcomeReturnUrl(subdomain, shop)}&claim=1`;
      localStorage.setItem("redirectAfterLogin", returnTo);
      router.push("/login");
      return;
    }
    runClaim();
  };

  useEffect(() => {
    if (isAdmin || authLoading || !user || !subdomain) return;
    if (searchParams.get("claim") !== "1" || claimStarted.current) return;
    claimStarted.current = true;
    runClaim();
  }, [isAdmin, authLoading, user, subdomain, searchParams, runClaim]);

  useEffect(() => {
    if (!isAdmin || !mappedDomain || !subdomain) return;

    let cancelled = false;
    let timer = null;

    const poll = async () => {
      try {
        const q = new URLSearchParams({ subdomain, domain: mappedDomain });
        const res = await fetch(`/api/domain-mapping-status?${q}`, {
          cache: "no-store",
        });
        if (cancelled || !res.ok) return;
        const { state } = await res.json();
        if (state === "ready" || state === "failed") {
          setDomainStatus(state);
          if (timer) clearInterval(timer);
        }
      } catch {
        /* pending */
      }
    };

    poll();
    timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [isAdmin, mappedDomain, subdomain]);

  const goEditProfile = useCallback(() => {
    if (subdomain) router.push(adminHref(subdomain, "edit-profile"));
  }, [subdomain, router]);

  const copyDomainUrl = async () => {
    const url = personalDomainUrl(mappedDomain);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setDomainUrlCopied(true);
      setTimeout(() => setDomainUrlCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const copyEmbed = async () => {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (!brand && !subdomain) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {displayName} is ready
        </h1>
        <p className="mt-3 text-sm text-muted">
          Sign in with Google to claim this store&apos;s avatar and finish setup.
        </p>
        {mappedDomain ? (
          <div className="mt-8 text-left">
            <DomainMappingBanner
              mappedDomain={mappedDomain}
              domainStatus="pending"
              domainUrlCopied={domainUrlCopied}
              onCopyDomainUrl={copyDomainUrl}
              onEditProfile={goEditProfile}
              showProfileNudge={false}
            />
          </div>
        ) : null}
        {claimError && (
          <p className="mt-3 text-sm text-red-600">{claimError}</p>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleClaimClick}
            disabled={claiming || authLoading}
            className="rounded-lg bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {claiming ? "Claiming…" : "Claim & continue"}
          </button>
          <a
            href={subdomain ? brandHomeUrl(subdomain, false) : "/"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-highlight hover:underline"
          >
            Preview homepage
          </a>
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-4xl px-4 py-10 md:py-14">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
          {displayName} is ready
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
          {domainStatus === "ready"
            ? "Your domain is live — finish profile, widget, and training below."
            : "Set up your profile and tools below while your personal domain finishes mapping."}
        </p>
      </div>

      <DomainMappingBanner
        mappedDomain={mappedDomain}
        domainStatus={domainStatus}
        domainUrlCopied={domainUrlCopied}
        onCopyDomainUrl={copyDomainUrl}
        onEditProfile={goEditProfile}
        showProfileNudge
      />

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StepCard
          step="1"
          title="Complete your profile"
          description={
            domainStatus === "ready"
              ? "Cover photo, title, and welcome message."
              : "Add your photo and welcome message while your domain connects."
          }
          action={
            <button
              type="button"
              onClick={() => router.push(adminHref(subdomain, "edit-profile"))}
              className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Edit profile
              <ArrowRight className="h-4 w-4" />
            </button>
          }
        />

        {hasShopify ? (
          <StepCard
            step="2"
            title="Shopify products"
            description={
              showShopifyProducts
                ? "Browse your catalog and train products so chat can recommend them."
                : "Your store is linked. Open Kavisha AI from Shopify Admin to enable product sync."
            }
            action={
              showShopifyProducts ? (
                <button
                  type="button"
                  onClick={() =>
                    router.push(adminHref(subdomain, "shopify-products"))
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  View &amp; train products
                  <Package className="h-4 w-4" />
                </button>
              ) : null
            }
            secondaryAction={
              <button
                type="button"
                onClick={() => router.push(adminHref(subdomain, "my-services"))}
                className="text-sm text-highlight hover:underline"
              >
                My services
              </button>
            }
          />
        ) : null}

        <StepCard
          step={hasShopify ? "3" : "2"}
          title="Visit your homepage"
          description="See your avatar site as visitors will."
          action={
            <a
              href={homeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted-bg"
            >
              Open homepage
              <Globe className="h-4 w-4" />
            </a>
          }
        />

        <StepCard
          step={hasShopify ? "4" : "3"}
          title="Embed the widget"
          description="Paste on your site for a floating chat."
          action={
            <button
              type="button"
              onClick={copyEmbed}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted-bg"
            >
              {embedCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy code
                </>
              )}
            </button>
          }
          secondaryAction={
            <a
              href={`/widget?brand=${encodeURIComponent(subdomain)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-highlight hover:underline"
            >
              Preview
            </a>
          }
        >
          {embedCode ? (
            <pre className="mt-3 overflow-x-auto rounded-lg bg-muted-bg/50 p-2 text-[10px] text-muted">
              <code>{embedCode}</code>
            </pre>
          ) : null}
        </StepCard>

        <StepCard
          step={hasShopify ? "5" : "4"}
          title="Train & personalize"
          description="Upload knowledge and tune personality."
          action={
            <button
              type="button"
              onClick={() => router.push(adminHref(subdomain, "train/v2"))}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted-bg"
            >
              Train
              <Sparkles className="h-4 w-4" />
            </button>
          }
          secondaryAction={
            <button
              type="button"
              onClick={() => router.push(adminHref(subdomain, "my-services"))}
              className="text-sm text-highlight hover:underline"
            >
              My services
            </button>
          }
        />
      </ul>

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          onClick={() => router.push(adminHref(subdomain, "v2"))}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <LayoutDashboard className="h-4 w-4" />
          Admin dashboard
        </button>
      </div>
    </div>
  );
}
