export default function SelectChatType({
  selectedType,
  selectChatType,
  isCreating,
}) {
  const opts = [
    { k: "job_seeker", label: "Job Seeker" },
    { k: "recruiter", label: "Recruiter" },
    { k: "dating", label: "Dating" },
  ];
  const base = "px-3 py-1.5 text-sm rounded border transition-colors";
  const cls = (k) =>
    selectedType === k
      ? "bg-slate-800 text-white border-slate-800"
      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50";

  return (
    <div className="flex justify-center py-3">
      <div className="flex gap-2">
        {opts.map(({ k, label }) => (
          <button
            key={k}
            onClick={() => !isCreating && selectChatType(k)}
            className={`${base} ${cls(k)}`}
            disabled={isCreating && selectedType !== k}
            aria-pressed={selectedType === k}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
