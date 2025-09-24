"use client";

export default function SelectChatType({
  servicesProvided,
  selectedType,
  selectChatType,
  isCreating,
}) {
  const base =
    "group relative px-6 py-3 text-center rounded-lg border transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed w-full";

  const cls = (item) =>
    selectedType === item.name
      ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400";

  return (
    <div className="flex items-center justify-center px-4 h-full min-h-screen">
      <div className="flex flex-col gap-3 w-full max-w-md">
        {servicesProvided.length > 0 &&
          servicesProvided.map((item) => (
            <button
              key={item.name}
              onClick={() =>
                !isCreating && selectChatType(item.name, item.initialMessage)
              }
              className={`${base} ${cls(item)}`}
              disabled={isCreating}
            >
              {isCreating && selectedType === item.name ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <span className="inline-block h-6 w-6 rounded-full border-2 border-white/70 border-t-transparent animate-spin"></span>
                  <span className="text-sm font-semibold">Starting…</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
              )}
            </button>
          ))}
      </div>
    </div>
  );
}
