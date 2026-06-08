import {
  ArrowRight,
  BarChart3,
  Code2,
  MessagesSquare,
  MousePointerClick,
  Plug,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Footer from "../components/Footer";

const FEATURES = [
  { id: "engagement", icon: TrendingUp, text: "INCREASED ENGAGEMENT" },
  { id: "conversations", icon: MessagesSquare, text: "MEANINGFUL CONVERSATIONS" },
  { id: "actions", icon: MousePointerClick, text: "FAVORABLE ACTIONS" },
  { id: "integration", icon: Plug, text: "SEAMLESS INTEGRATION" },
];

const STEPS = [
  {
    num: "01",
    icon: Sparkles,
    body: "Train your Avataar with all the information on your website (No limits!). Tweak the personality of your Avataar so it sounds just like you.",
  },
  {
    num: "02",
    icon: Code2,
    body: "Integrate the code snippet of the widget to your website.",
  },
  {
    num: "03",
    icon: BarChart3,
    body: "See the magic happen and enjoy advanced analytics.",
  },
];

const STATS = [
  { value: "12", suffix: "x", label: "User Engagement" },
  { value: "4", suffix: "x", label: "Call-to-action" },
  { value: "24", suffix: "hr", label: "Integration" },
];

const CONTACT_SALES_MAILTO = (() => {
  const subject = encodeURIComponent("Kavisha AI Widget — sales inquiry");
  const body = encodeURIComponent(
    "Hey I'm interested in getting the Kavisha AI Widget on my website. Tell me how I can go ahead!",
  );
  return `mailto:hello@kavisha.ai?subject=${subject}&body=${body}`;
})();

function FeatureStrip() {
  return (
    <section className="w-full px-5 pb-12 sm:pb-16 md:px-8 md:pb-20">
      <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {FEATURES.map((feature, i) => {
          const Icon = feature.icon;
          const [headline, ...rest] = feature.text.split(" ");
          const subline = rest.join(" ");

          return (
            <div
              key={feature.id}
              className="group rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 sm:p-6 md:p-8"
            >
              <div className="mb-6 flex items-start justify-between gap-3">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20 transition-all group-hover:bg-accent/15 group-hover:ring-accent/35">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <span
                  className="font-figtree text-3xl font-light leading-none tabular-nums text-border transition-colors group-hover:text-accent/25 md:text-4xl"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="font-figtree text-xs font-semibold uppercase leading-[1.45] tracking-[0.16em]">
                <span className="block text-foreground">{headline}</span>
                <span className="block text-muted">{subline}</span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="px-5 py-14 sm:py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="landing-label">How it works</p>
        <h2 className="mt-3 text-2xl font-normal tracking-tight text-foreground sm:text-3xl md:text-4xl">
          Three steps to go live
        </h2>
      </div>

      <div className="relative mx-auto mt-10 max-w-2xl sm:mt-14 md:mt-16">
        <div
          className="absolute left-[1.375rem] top-7 bottom-7 w-px bg-gradient-to-b from-accent/40 via-border to-accent/40 sm:left-[1.6875rem] sm:top-8 sm:bottom-8"
          aria-hidden
        />
        <ol className="relative space-y-0">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.num}
                className={`relative flex gap-4 sm:gap-5 md:gap-7 ${i < STEPS.length - 1 ? "pb-8 sm:pb-10 md:pb-12" : ""}`}
              >
                <div className="relative z-10 flex shrink-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent shadow-sm shadow-accent/5 sm:h-[3.375rem] sm:w-[3.375rem] sm:rounded-2xl">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
                  </div>
                </div>
                <article className="min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 py-4 transition-colors hover:border-accent/25 sm:px-5 sm:py-5 md:px-7 md:py-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="landing-label">Step {i + 1}</p>
                    <span
                      className="font-figtree text-2xl font-light tabular-nums text-border md:text-3xl"
                      aria-hidden
                    >
                      {step.num}
                    </span>
                  </div>
                  <p className="mt-2 font-figtree text-sm leading-relaxed text-foreground sm:mt-3 sm:text-base md:text-lg">
                    {step.body}
                  </p>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default function WidgetIntroPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-background font-baloo text-foreground">
      <section className="homepage-hero relative isolate overflow-hidden pt-16">
        <div className="homepage-glow homepage-glow-a opacity-40" aria-hidden />

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 pb-16 pt-6 sm:gap-10 sm:pb-20 sm:pt-8 md:px-8 md:pb-28 lg:grid-cols-[1.2fr_0.55fr] lg:gap-12">
          <div className="text-center sm:text-left">
            <p className="landing-label">Website widget</p>
            <h1 className="mt-4 text-3xl font-normal leading-[0.95] tracking-tight sm:text-4xl md:text-5xl lg:text-[4rem] xl:text-[4.5rem]">
              An <span className="text-accent">AI Agent</span> for your website
            </h1>
            <p className="mx-auto mt-5 max-w-xl font-figtree text-sm leading-relaxed text-muted sm:mx-0 sm:mt-6 sm:text-base md:text-lg">
              Using Kavisha, you can create a custom AI Widget that talks to your
              website&apos;s casual visitors, and converts them into customers and
              deep admirers.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[200px] sm:max-w-[220px] md:max-w-[240px]">
              <div className="overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-md">
                <img
                  src="/entrackr-widget.png"
                  alt="Kavisha AI widget on a website"
                  className="block w-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeatureStrip />
      <HowItWorks />

      <section className="border-y border-border/60 bg-muted-bg/30 px-5 py-12 sm:py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <p className="text-3xl font-normal sm:text-5xl md:text-7xl">
                <span className="text-accent">{stat.value}</span>
                <span className="text-foreground">{stat.suffix}</span>
              </p>
              <p className="mt-1 font-figtree text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-muted sm:mt-2 sm:text-xs md:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-16 sm:py-24 md:px-8 md:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 className="text-2xl font-normal tracking-tight sm:text-3xl md:text-5xl lg:text-6xl">
            Get a custom <span className="text-accent">AI Agent</span> for your website
          </h2>
          <p className="mt-4 font-figtree text-base text-muted sm:mt-6 sm:text-lg md:text-xl">
            Free to get started
          </p>
          <a
            href={CONTACT_SALES_MAILTO}
            className="group mt-8 inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-accent px-8 py-3.5 font-figtree text-sm font-medium text-white transition-all hover:brightness-95 sm:mt-10 sm:w-auto sm:max-w-none md:text-base"
          >
            Contact sales
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </section>

      <section className="border-t border-border px-5 py-12 sm:py-14 md:px-8 md:py-20">
        <p className="mx-auto max-w-3xl text-center font-figtree text-sm leading-relaxed text-muted sm:text-base md:text-xl">
          With Kavisha, influencers and brands can interact with their fans, create
          opportunities for them, and make them happy. Like never before.
        </p>
      </section>

      <Footer />
    </main>
  );
}
