export default function SelectChatType({
  selectedType,
  selectChatType,
  isCreating,
}) {
  const opts = [
    { k: "job_seeker", label: "Job Seeker", emoji: "🧑‍💼" },
    { k: "recruiter", label: "Recruiter", emoji: "🧲" },
    { k: "dating", label: "Dating", emoji: "💖" },
  ];
  const base =
    "px-5 py-3 text-base sm:text-lg rounded-xl border transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60 disabled:cursor-not-allowed";
  const cls = (k) =>
    selectedType === k
      ? "bg-slate-800 text-white border-slate-800 scale-105"
      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50";

  return (
    <div className="flex h-full items-center justify-center py-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {opts.map(({ k, label, emoji }) => (
          <button
            key={k}
            onClick={() => !isCreating && selectChatType(k)}
            className={`${base} ${cls(k)}`}
            disabled={isCreating}
            aria-pressed={selectedType === k}
            aria-busy={isCreating && selectedType === k}
          >
            {isCreating && selectedType === k ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin"></span>
                <span>Starting…</span>
              </span>
            ) : (
              <>
                <span className="mr-2">{emoji}</span>
                {label}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
