"use client";

const SERVICE_ROWS = [
  { id: "chat", label: "Chat services", isActive: (d) => (d?.services?.length ?? 0) > 0 },
  { id: "professional", label: "Professional connect", isActive: (d) => Boolean(d?.enableProfessionalConnect) },
  { id: "quiz", label: "Quiz/survey", isActive: (d) => Boolean(d?.enableQuiz) },
  { id: "blog", label: "Blog", isActive: (d) => Boolean(d?.enableBlogs) },
  { id: "links", label: "Links", isActive: (d) => d?.enableLinks !== false },
  { id: "friend", label: "Friend connect", isActive: (d) => Boolean(d?.enableFriendConnect) },
  { id: "jobs", label: "Jobs", isActive: (d) => Boolean(d?.enableJobs) },
  { id: "products", label: "Products", isActive: (d) => Boolean(d?.enableProducts) },
  { id: "bookings", label: "Bookings", isActive: (d) => Boolean(d?.enableBooking) },
  { id: "widget", label: "Widget", isActive: (d) => Boolean(String(d?.clientWidgetUrl || "").trim()) },
];

export default function BrandActivatedServices({ brandName, brandDetail }) {
  if (!brandDetail) return null;

  return (
    <section className="mt-6 border-t border-border pt-6">
      <h2 className="text-sm font-semibold text-foreground">
        Services activated by {brandName}
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
        {SERVICE_ROWS.map(({ id, label, isActive }) => {
          const active = isActive(brandDetail);
          return (
            <li key={id} className="flex min-w-0 items-center gap-2 text-sm">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-emerald-500" : "bg-red-500"}`}
                aria-hidden
              />
              <span className={active ? "text-foreground" : "text-muted"}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
