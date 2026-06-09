function formatRs(amount) {
  return `Rs. ${Number(amount).toLocaleString("en-IN")}/-`;
}

function perMessagePrice(price, messages) {
  if (!messages || !price) return null;
  const per = price / messages;
  return per >= 1 ? per.toFixed(1) : per.toFixed(2);
}

function PlanBadge({ type }) {
  if (type === "current") {
    return (
      <span className="absolute right-3 top-3 rounded-full bg-[#7a2f3f] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        Current plan
      </span>
    );
  }
  if (type === "popular") {
    return (
      <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        Most popular
      </span>
    );
  }
  return null;
}

export default function PlanTierCard({
  name,
  messages,
  price,
  badge = null,
  recommended = false,
  isCurrent = false,
  isSelected = false,
  onBuy,
}) {
  const perMsg = perMessagePrice(price, messages);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-card px-4 pb-4 pt-5 shadow-sm ${
        isCurrent ? "border-highlight/40 ring-1 ring-highlight/15" : "border-border"
      }`}
    >
      <PlanBadge type={badge} />
      <p className="text-lg font-bold text-highlight">{name}</p>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-foreground">
        <li>{messages.toLocaleString("en-IN")} messages</li>
        <li>{price === 0 ? "Free" : `${formatRs(price)}/month`}</li>
        {perMsg ? <li>Rs. {perMsg}/message</li> : null}
      </ul>
      {recommended ? (
        <p className="mt-3 text-xs font-medium italic text-emerald-600 dark:text-emerald-400">
          Recommended for you
        </p>
      ) : (
        <div className="mt-3 h-4" />
      )}
      <button
        type="button"
        disabled={isCurrent}
        onClick={onBuy}
        className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition-opacity ${
          isCurrent
            ? "cursor-not-allowed bg-muted-bg text-muted"
            : isSelected
              ? "bg-highlight text-white opacity-90"
              : "bg-highlight text-white hover:opacity-90"
        }`}
      >
        {isCurrent ? "Active plan" : price === 0 ? "Current tier" : "Buy"}
      </button>
    </div>
  );
}
