"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import PlanTierCard from "@/app/components/PlanTierCard";
import FAQcard from "@/app/components/FAQcard";
import InvoicesSection from "@/app/components/InvoicesSection";

const PLANS = [
  {
    id: "free",
    name: "Free",
    messages: 500,
    price: 0,
    badge: null,
    recommended: false,
  },
  {
    id: "tier-1",
    name: "Tier 1",
    messages: 2000,
    price: 1000,
    badge: null,
    recommended: false,
  },
  {
    id: "tier-2",
    name: "Tier 2",
    messages: 10000,
    price: 3000,
    badge: null,
    recommended: false,
  },
  {
    id: "tier-3",
    name: "Tier 3",
    messages: 40000,
    price: 10000,
    badge: "popular",
    recommended: true,
  },
  {
    id: "tier-4",
    name: "Tier 4",
    messages: 100000,
    price: 20000,
    badge: null,
    recommended: false,
  },
];

/** Demo invoices — all brand payments (plans, add-ons, future services). */
const DEFAULT_INVOICES = [
  {
    id: "mar-2026-tier2",
    paidAt: "2026-03-16",
    dateLabel: "16 Mar 2026",
    description: "Tier 2 — monthly messages",
    serviceType: "messages",
    amount: 3000,
    status: "paid",
  },
  {
    id: "mar-2026-upgrade-failed",
    paidAt: "2026-03-08",
    dateLabel: "8 Mar 2026",
    description: "Tier 3 upgrade",
    serviceType: "messages",
    amount: 10000,
    status: "failed",
  },
  {
    id: "feb-2026-tier2",
    paidAt: "2026-02-16",
    dateLabel: "16 Feb 2026",
    description: "Tier 2 — monthly messages",
    serviceType: "messages",
    amount: 3000,
    status: "paid",
  },
  {
    id: "feb-2026-quiz",
    paidAt: "2026-02-20",
    dateLabel: "20 Feb 2026",
    description: "Quiz module add-on",
    serviceType: "quizzes",
    amount: 1500,
    status: "paid",
  },
  {
    id: "jan-2026-tier2",
    paidAt: "2026-01-16",
    dateLabel: "16 Jan 2026",
    description: "Tier 2 — monthly messages",
    serviceType: "messages",
    amount: 3000,
    status: "paid",
  },
  {
    id: "jan-2026-quiz-pending",
    paidAt: "2026-01-28",
    dateLabel: "28 Jan 2026",
    description: "Quiz module add-on",
    serviceType: "quizzes",
    amount: 1500,
    status: "pending",
  },
  {
    id: "dec-2025-tier2",
    paidAt: "2025-12-16",
    dateLabel: "16 Dec 2025",
    description: "Tier 2 — monthly messages",
    serviceType: "messages",
    amount: 3000,
    status: "paid",
  },
  {
    id: "nov-2025-tier1",
    paidAt: "2025-11-16",
    dateLabel: "16 Nov 2025",
    description: "Tier 1 — monthly messages",
    serviceType: "messages",
    amount: 1000,
    status: "paid",
  },
  {
    id: "nov-2025-rejected",
    paidAt: "2025-11-02",
    dateLabel: "2 Nov 2025",
    description: "Tier 2 upgrade",
    serviceType: "messages",
    amount: 3000,
    status: "rejected",
  },
  {
    id: "oct-2025-tier1",
    paidAt: "2025-10-16",
    dateLabel: "16 Oct 2025",
    description: "Tier 1 — monthly messages",
    serviceType: "messages",
    amount: 1000,
    status: "paid",
  },
  {
    id: "sep-2025-tier1",
    paidAt: "2025-09-20",
    dateLabel: "20 Sept 2025",
    description: "Tier 1 — monthly messages",
    serviceType: "messages",
    amount: 1000,
    status: "paid",
  },
];

function getDemoInvoices(subdomain) {
  const sub = String(subdomain || "").trim().toLowerCase();

  if (sub === "entrackr") {
    return [
      {
        id: "entrackr-q2-2026",
        paidAt: "2026-04-22",
        dateLabel: "22 Apr 2026",
        description: "3-month plan — 50,000 messages",
        serviceType: "messages",
        amount: 15000,
        status: "paid",
      },
      {
        id: "entrackr-failed-apr",
        paidAt: "2026-04-10",
        dateLabel: "10 Apr 2026",
        description: "Quiz module add-on",
        serviceType: "quizzes",
        amount: 2000,
        status: "failed",
      },
    ];
  }

  if (sub === "unsaidtalks") {
    return [
      {
        id: "unsaid-q2-2026",
        paidAt: "2026-04-22",
        dateLabel: "22 Apr 2026",
        description: "3-month plan — 30,000 messages",
        serviceType: "messages",
        amount: 10000,
        status: "paid",
      },
    ];
  }

  if (sub === "vishalgupta") {
    return [];
  }

  return DEFAULT_INVOICES;
}

/** Set false when wiring GET /api/admin/billing/summary */
const BILLING_USE_DEMO = true;

function getDemoBillingSummary(subdomain) {
  const sub = String(subdomain || "").trim().toLowerCase();

  if (sub === "vishalgupta") {
    return {
      displayMode: "free_access",
      planLabel: "Free access",
      message: "You have access to unlimited messages for now.",
      messagesUsed: 0,
      messageQuota: null,
      usagePct: 0,
      paused: false,
      freeAccessAllowed: true,
    };
  }

  if (sub === "entrackr") {
    return {
      displayMode: "custom",
      planLabel: "3-month plan",
      planTier: "custom",
      planPrice: 15000,
      isCustomPeriod: true,
      chatQuota: 5000,
      messageQuota: 50000,
      messagesUsed: 476,
      usagePct: 1,
      paused: false,
      daysRemaining: 53,
      periodEndLabel: "31 July 2026",
      periodStartLabel: "1 May 2026",
      freeAccessAllowed: false,
    };
  }

  if (sub === "unsaidtalks") {
    return {
      displayMode: "custom",
      planLabel: "3-month plan",
      planTier: "custom",
      planPrice: 10000,
      isCustomPeriod: true,
      chatQuota: 3000,
      messageQuota: 30000,
      messagesUsed: 36,
      usagePct: 0,
      paused: false,
      daysRemaining: 53,
      periodEndLabel: "31 July 2026",
      periodStartLabel: "1 May 2026",
      freeAccessAllowed: false,
    };
  }

  return {
    displayMode: "tier",
    planLabel: "Free",
    planTier: "free",
    planPrice: 0,
    isCustomPeriod: false,
    messageQuota: 500,
    messagesUsed: 36,
    usagePct: 7,
    paused: false,
    daysRemaining: 22,
    periodEndLabel: "30 June 2026",
    periodStartLabel: "1 June 2026",
    freeAccessAllowed: false,
  };
}

const FAQS = [
  {
    q: "What happens when I run out of messages?",
    a: "Your avatar stays online, but the AI pauses on new visitor messages until you upgrade or your plan renews. Existing conversations you've already started are not affected.",
  },
  {
    q: "Will my chatbot stop immediately after expiry?",
    a: "When your billing cycle ends, visitors can still open the widget, but the AI won't respond to new messages until you renew or switch plans.",
  },
  {
    q: "Do unused messages carry forward to the next cycle?",
    a: "Unused messages do not roll over. Each cycle starts fresh with the message quota included in your active plan.",
  },
  {
    q: "Can I upgrade my plan anytime?",
    a: "Yes. You can choose a higher tier whenever you like. The upgrade is queued and begins automatically once your current plan period ends.",
  },
  {
    q: "What happens if I upgrade mid-cycle?",
    a: "Your new plan is scheduled for the next cycle — you keep your current quota until expiry, then the upgraded allowance and pricing take effect.",
  },
  {
    q: "Can I downgrade my plan?",
    a: "You can select a lower tier at any time. It will apply from your next renewal date; your current cycle's benefits stay unchanged until then.",
  },
  {
    q: "How are messages counted?",
    a: "Each visitor message and each assistant reply in a lead-journey conversation counts as one message. The opening bot greeting when a session starts is not counted.",
  },
  {
    q: "Do bot errors or failed responses count as messages?",
    a: "No. If the assistant fails to deliver a proper reply due to a system error, that interaction is not deducted from your message balance.",
  },
];

function formatRs(amount) {
  return `Rs. ${Number(amount).toLocaleString("en-IN")}/-`;
}

/** Color stops for usage-based plan card (green → yellow → orange → red). */
const PLAN_PALETTES = {
  green: {
    bg: "#eef6ee",
    border: "#c8dcc8",
    accent: "#4a7c3f",
    bar: "#5d8a4a",
    barTrack: "#dde9dd",
    counter: "#4a5d4a",
  },
  yellow: {
    bg: "#f6f3e6",
    border: "#e5ddb0",
    accent: "#9a7b28",
    bar: "#b8943a",
    barTrack: "#ece8d6",
    counter: "#6b5e3a",
  },
  orange: {
    bg: "#fdf1e8",
    border: "#f0d0b8",
    accent: "#c45e1a",
    bar: "#d97706",
    barTrack: "#f5e6d8",
    counter: "#8b5a2b",
  },
  red: {
    bg: "#fdf0ef",
    border: "#f0c8c4",
    accent: "#c53030",
    bar: "#a63d3d",
    barTrack: "#f5dedc",
    counter: "#a63d3d",
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const toHex = (n) =>
    Math.round(clamp(n, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerpPalette(a, b, t) {
  const keys = Object.keys(a);
  const out = {};
  for (const key of keys) {
    const ca = hexToRgb(a[key]);
    const cb = hexToRgb(b[key]);
    out[key] = rgbToHex(
      lerp(ca.r, cb.r, t),
      lerp(ca.g, cb.g, t),
      lerp(ca.b, cb.b, t),
    );
  }
  return out;
}

function paletteForUsage(usagePct) {
  const t = clamp(usagePct / 100, 0, 1);
  if (t <= 1 / 3) {
    return lerpPalette(PLAN_PALETTES.green, PLAN_PALETTES.yellow, t / (1 / 3));
  }
  if (t <= 2 / 3) {
    return lerpPalette(
      PLAN_PALETTES.yellow,
      PLAN_PALETTES.orange,
      (t - 1 / 3) / (1 / 3),
    );
  }
  return lerpPalette(
    PLAN_PALETTES.orange,
    PLAN_PALETTES.red,
    (t - 2 / 3) / (1 / 3),
  );
}

function getPlanVisualState(summary) {
  if (summary.displayMode === "free_access") {
    return {
      variant: "free_access",
      palette: PLAN_PALETTES.green,
      usagePct: 0,
    };
  }

  const usagePct = summary.usagePct ?? 0;
  const daysRemaining = summary.daysRemaining ?? 999;

  if (summary.paused) {
    return { variant: "paused", palette: PLAN_PALETTES.red, usagePct: 100 };
  }

  if (daysRemaining < 10) {
    return { variant: "urgent_time", palette: PLAN_PALETTES.red, usagePct };
  }

  return {
    variant: "active",
    palette: paletteForUsage(usagePct),
    usagePct,
  };
}

function planSubtitle(summary) {
  if (summary.isCustomPeriod) {
    return `${summary.messageQuota?.toLocaleString("en-IN")} messages${
      summary.chatQuota
        ? ` (${summary.chatQuota.toLocaleString("en-IN")} chats)`
        : ""
    } for ${formatRs(summary.planPrice)} (${summary.planLabel})`;
  }
  if (summary.planPrice > 0) {
    return `${summary.messageQuota?.toLocaleString("en-IN")} messages for ${formatRs(summary.planPrice)}/month`;
  }
  return `${summary.messageQuota?.toLocaleString("en-IN")} messages per month — Free`;
}

function YourPlanSection({ summary, loading, error, onUpgradeClick, isDemo }) {
  if (loading) {
    return (
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-highlight">Your plan</h2>
        <div className="rounded-2xl border border-border bg-card px-5 py-8 text-sm text-muted">
          Loading your plan…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-highlight">Your plan</h2>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      </section>
    );
  }

  if (!summary) return null;

  const isFreeAccess = summary.displayMode === "free_access";
  const visual = getPlanVisualState(summary);
  const { palette, usagePct } = visual;
  const transition = "transition-[background-color,border-color,color] duration-500 ease-in-out";

  const planDetailLine = planSubtitle(summary);

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-baseline gap-2">
        <h2 className="text-xl font-semibold text-highlight">Your plan</h2>
        {isDemo ? (
          <span className="rounded-full bg-muted-bg px-2.5 py-0.5 text-xs font-medium text-muted">
            Demo
          </span>
        ) : null}
      </div>
      <div className="space-y-3">
        {/* Plan summary card — color shifts with usage / urgency */}
        <div
          className={`rounded-2xl border px-5 py-4 ${transition}`}
          style={{
            backgroundColor: palette.bg,
            borderColor: palette.border,
          }}
        >
          {isFreeAccess ? (
            <>
              <p className="text-base font-semibold text-foreground">Free access</p>
              <p className="mt-2 text-sm text-muted">{summary.message}</p>
            </>
          ) : visual.variant === "paused" ? (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span
                    className="text-base font-bold"
                    style={{ color: palette.accent }}
                  >
                    Chatbot paused!
                  </span>
                  <span className="text-sm italic text-muted">
                    {summary.pauseReason === "quota"
                      ? "Message limit reached"
                      : `Plan ended on ${summary.periodEndLabel}`}
                  </span>
                </div>
                <p className="mt-2 text-base font-semibold text-foreground">
                  Recent plan: {summary.planLabel}
                </p>
                <p className="mt-0.5 text-sm italic text-muted">{planDetailLine}</p>
              </div>
              <button
                type="button"
                onClick={onUpgradeClick}
                className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: palette.bar }}
              >
                Upgrade plan
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-base font-semibold text-foreground">
                  Current plan: {summary.planLabel}
                </span>
                <span className="text-sm italic text-muted">{planDetailLine}</span>
              </div>
              {summary.isCustomPeriod &&
              summary.periodStartLabel &&
              summary.periodEndLabel ? (
                <p className="mt-1 text-sm text-muted">
                  Billing period: {summary.periodStartLabel} –{" "}
                  {summary.periodEndLabel}
                </p>
              ) : null}
              {summary.periodEndLabel ? (
                <p className="mt-2 text-sm text-muted">
                  {visual.variant === "urgent_time" ? (
                    <>
                      Ends in{" "}
                      <span
                        className="font-bold"
                        style={{ color: palette.accent }}
                      >
                        {summary.daysRemaining} day
                        {summary.daysRemaining === 1 ? "" : "s"}!
                      </span>{" "}
                      <span className="italic">({summary.periodEndLabel})</span>
                    </>
                  ) : (
                    <>
                      Ends in{" "}
                      <span
                        className="font-semibold"
                        style={{ color: palette.accent }}
                      >
                        {summary.daysRemaining} day
                        {summary.daysRemaining === 1 ? "" : "s"}
                      </span>{" "}
                      <span className="italic">({summary.periodEndLabel})</span>
                    </>
                  )}
                </p>
              ) : null}
            </>
          )}
        </div>

        {/* Usage card — progress bar color matches usage */}
        {!isFreeAccess ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-foreground">
                Messages used{" "}
                <span className="font-semibold">
                  {summary.messagesUsed?.toLocaleString("en-IN")}
                </span>{" "}
                out of {summary.messageQuota?.toLocaleString("en-IN")}
              </span>
              <span
                className="shrink-0 tabular-nums text-sm italic"
                style={{ color: palette.counter }}
              >
                {summary.messagesUsed}/{summary.messageQuota} messages
              </span>
            </div>
            <div
              className={`mt-3 h-2.5 overflow-hidden rounded-full ${transition}`}
              style={{ backgroundColor: palette.barTrack }}
            >
              <div
                className={`h-full rounded-full ${transition}`}
                style={{
                  width: `${usagePct}%`,
                  backgroundColor: palette.bar,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function BillingsPage() {
  const router = useRouter();
  const brand = useBrandContext();
  const choosePlanRef = useRef(null);
  const scrollToChoosePlan = () => {
    choosePlanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const [openFaq, setOpenFaq] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    if (!brand?.subdomain) {
      setSummaryLoading(false);
      return;
    }

    if (BILLING_USE_DEMO) {
      setSummaryLoading(false);
      setSummaryError("");
      setSummary(getDemoBillingSummary(brand.subdomain));
      return;
    }

    let cancelled = false;
    (async () => {
      setSummaryLoading(true);
      setSummaryError("");
      try {
        const res = await fetch(
          `/api/admin/billing/summary?brand=${encodeURIComponent(brand.subdomain)}`,
          { credentials: "include" },
        );
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("Failed to load billing");
        }
        if (!res.ok) {
          throw new Error(data.error || "Failed to load billing");
        }
        if (!cancelled) setSummary(data.summary);
      } catch (err) {
        if (!cancelled) {
          setSummary(null);
          setSummaryError(err.message || "Failed to load billing");
        }
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [brand?.subdomain]);

  const currentPlanId = useMemo(() => {
    if (!summary || summary.displayMode === "free_access") return null;
    if (summary.planTier === "custom") return null;
    return summary.planTier || "free";
  }, [summary]);

  const invoices = useMemo(
    () => getDemoInvoices(brand?.subdomain),
    [brand?.subdomain],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-16 font-baloo text-foreground md:px-6">
      <div className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/admin/${brand?.subdomain}/v2`)}
          className="text-foreground transition-opacity hover:opacity-70"
          aria-label="Back to admin home"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-highlight md:text-4xl">Billing</h1>
          <p className="mt-1 text-sm text-muted md:text-base">
            Manage your plan, usage, and invoices for {brand?.brandName || "your avatar"}
          </p>
        </div>
      </div>

      <YourPlanSection
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
        onUpgradeClick={scrollToChoosePlan}
        isDemo={BILLING_USE_DEMO}
      />

      {/* Choose a plan */}
      <section ref={choosePlanRef} className="mb-10 scroll-mt-6">
        <h2 className="mb-4 text-xl font-semibold text-highlight">Choose a plan!</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <PlanTierCard
                key={plan.id}
                name={plan.name}
                messages={plan.messages}
                price={plan.price}
                badge={isCurrent ? "current" : plan.badge}
                recommended={plan.recommended}
                isCurrent={isCurrent}
                isSelected={selectedPlan === plan.id}
                onBuy={() => setSelectedPlan(plan.id)}
              />
            );
          })}
        </div>

        <ul className="mt-6 space-y-2 text-sm text-muted">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
            After you buy or upgrade a plan, your new plan will start once the old plan
            expires.
          </li>
        </ul>
      </section>

      <InvoicesSection
        invoices={invoices}
        isDemo={BILLING_USE_DEMO}
        brandName={brand?.brandName}
      />

      {/* FAQs */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-foreground">FAQs</h2>
        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <FAQcard
              key={item.q}
              question={`${i + 1}. ${item.q}`}
              answer={item.a}
              open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? null : i)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
