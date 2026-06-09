"use client";

function clampPercent(value) {
  return Math.round(Math.min(100, Math.max(0, Number(value) || 0)));
}

export default function ChatSessionHeader({
  logoUrl = "",
  sessionTitle = "",
  showOnboardingProgress = false,
  onboardingPercent = 0,
}) {
  const title = String(sessionTitle).trim();
  const logo = String(logoUrl).trim();

  if (!title && !logo) return null;

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-2.5 sm:pt-3">
      <div className="inline-flex max-w-[min(100%,24rem)] items-center gap-2 rounded-full border border-gray-200 bg-white/90 py-0.5 pl-0.5 pr-3 shadow-sm backdrop-blur-lg dark:border-gray-700 dark:bg-gray-900/90">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="size-8 shrink-0 rounded-full object-cover ring-1 ring-gray-200 sm:size-9 dark:ring-gray-700"
          />
        ) : null}
        {title ? (
          <p className="min-w-0 truncate pr-0.5 text-sm font-semibold leading-none tracking-[0.01em] text-foreground sm:text-[0.9375rem]">
            {title}
          </p>
        ) : null}
      </div>

      {showOnboardingProgress ? (
        <div className="pointer-events-auto mt-2.5 inline-flex items-baseline gap-1 rounded-full border border-border/45 bg-muted/35 px-3 py-1 text-xs tabular-nums shadow-sm backdrop-blur-sm">
          <span className="font-semibold text-foreground">
            {clampPercent(onboardingPercent)}%
          </span>
          <span className="text-muted">completed</span>
        </div>
      ) : null}
    </header>
  );
}
