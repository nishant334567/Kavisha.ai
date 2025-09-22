"use client";

export default function SelectChatType({
  servicesProvided,
  selectedType,
  selectChatType,
  isCreating,
}) {
  const getIcon = (serviceName) => {
    const icons = {
      job_seeker: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      recruiter: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      dating: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ),
      lead_journey: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    };
    return (
      icons[serviceName] || (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      )
    );
  };

  const getSubtext = (serviceName) => {
    const subtexts = {
      job_seeker: "Find your dream job with AI assistance",
      recruiter: "Discover top talent for your company",
      dating: "Connect with your perfect match",
      lead_journey: "Generate and nurture business leads",
    };
    return subtexts[serviceName] || "Get started with our AI service";
  };

  const base =
    "group relative px-8 py-6 text-left rounded-2xl border-2 transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 disabled:opacity-60 disabled:cursor-not-allowed w-[320px] h-[200px]";

  const cls = (item) =>
    selectedType === item.name
      ? "bg-gradient-to-br from-blue-600 to-purple-700 text-white border-blue-500 scale-105 shadow-2xl"
      : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50";

  return (
    <div className="flex items-center justify-center px-4 h-full min-h-screen">
      <div className="flex pt-12 pb-20 h-screen overflow-y-auto flex-wrap items-center justify-center gap-6 max-w-6xl">
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
                <div className="flex flex-col items-center justify-center space-y-3">
                  <span className="inline-block h-8 w-8 rounded-full border-3 border-white/70 border-t-transparent animate-spin"></span>
                  <span className="text-lg font-semibold">Starting…</span>
                </div>
              ) : (
                <div className="flex flex-col items-start space-y-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-xl ${selectedType === item.name ? "bg-white/20" : "bg-blue-100"}`}
                    >
                      {getIcon(item.name)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{item.title}</h3>
                    </div>
                  </div>
                  <p
                    className={`text-sm leading-relaxed line-clamp-3 ${selectedType === item.name ? "text-white/90" : "text-slate-600"}`}
                  >
                    {getSubtext(item.name)}
                  </p>
                  <div className="flex items-center text-sm font-medium">
                    <span
                      className={`${selectedType === item.name ? "text-white/80" : "text-blue-600"}`}
                    >
                      Get Started →
                    </span>
                  </div>
                </div>
              )}
            </button>
          ))}
      </div>
    </div>
  );
}
