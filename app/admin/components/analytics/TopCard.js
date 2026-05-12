export default function TopCard({ title, value, infoMessage }) {
  return (
    <div className="group relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md dark:ring-white/[0.05]">
      <div className="px-6 py-6 sm:px-7 sm:py-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-4xl font-semibold tracking-tight text-[#18A6B8] sm:text-5xl">
              {value}
            </div>
            <div className="mt-2 text-lg font-medium leading-snug text-foreground sm:text-xl">
              {title}
            </div>
          </div>
        </div>

        {infoMessage ? (
          <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {infoMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}