"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import Loader from "@/app/components/Loader";
import {
  ArrowRight,
  Check,
  Copy,
  Globe,
  LayoutDashboard,
  Loader2,
  Sparkles,
  User,
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

function brandHomeUrl(subdomain) {
  if (typeof window === "undefined") return "/";
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${origin}/?subdomain=${encodeURIComponent(subdomain)}`;
  }
  const onStaging = hostname.includes(".staging.");
  if (onStaging) return `https://${subdomain}.staging.kavisha.ai`;
  return `https://${subdomain}.kavisha.ai`;
}

function embedSnippet(subdomain) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://kavisha.ai";
  return `<script src="${origin}/embed.js" data-brand="${subdomain}"></script>`;
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
  const [copied, setCopied] = useState(false);
  const [domainStatus, setDomainStatus] = useState("pending");

  const subdomain = brand?.subdomain || searchParams.get("subdomain") || "";
  const displayName = brand?.brandName || subdomain || "Your avatar";
  const mappedDomain = useMemo(
    () => mappedDomainName(subdomain, searchParams.get("domain")),
    [subdomain, searchParams]
  );
  const homeUrl = useMemo(
    () => (subdomain ? brandHomeUrl(subdomain) : "/"),
    [subdomain]
  );
  const embedCode = useMemo(
    () => (subdomain ? embedSnippet(subdomain) : ""),
    [subdomain]
  );

  useEffect(() => {
    if (!mappedDomain || !subdomain) return;

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
        // keep showing pending
      }
    };

    poll();
    timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [mappedDomain, subdomain]);

  const copyEmbed = async () => {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!brand && !subdomain) {
    return <Loader loadingMessage="Loading..." />;
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-4xl px-4 py-10 md:py-14">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
          {displayName} is ready
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Finish setup below — profile, homepage, widget, and training.
        </p>
      </div>

      {mappedDomain && (
        <p className="mb-8 flex items-center justify-center gap-2 text-center text-sm text-muted">
          {domainStatus === "ready" ? (
            <>
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <a
                href={`https://${mappedDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline"
              >
                {mappedDomain}
              </a>
              <span>is live</span>
            </>
          ) : domainStatus === "failed" ? (
            <span>Couldn&apos;t connect {mappedDomain}. Contact support.</span>
          ) : (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              <span>
                Connecting <span className="text-foreground">{mappedDomain}</span>
                …
              </span>
            </>
          )}
        </p>
      )}

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StepCard
          step="1"
          title="Complete your profile"
          description="Cover photo, title, and welcome message."
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

        <StepCard
          step="2"
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
          step="3"
          title="Embed the widget"
          description="Paste on your site for a floating chat."
          action={
            <button
              type="button"
              onClick={copyEmbed}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted-bg"
            >
              {copied ? (
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
          step="4"
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
