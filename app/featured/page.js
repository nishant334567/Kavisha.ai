"use client";

import Link from "next/link";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import {
  ClipboardList,
  Package,
  CalendarClock,
  BookOpen,
  Briefcase,
  Sparkles,
} from "lucide-react";

function FeaturedCard({ href, title, description, icon: Icon }) {
  return (
    <Link
      href={href}
      className="group flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border bg-card font-baloo tracking-[0.06em] shadow-sm transition-all hover:border-highlight/40 hover:shadow-md"
    >
      {/* Colored strip: icon + title (stacked for 2-col grid cells) */}
      <div className="flex min-h-0 flex-col gap-2 bg-muted-bg px-3 py-3 sm:px-4 sm:py-3">
        <Icon
          className="h-5 w-5 shrink-0 text-foreground/80 transition-colors group-hover:text-highlight"
          strokeWidth={2}
          aria-hidden
        />
        <h2 className="text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-highlight sm:text-base">
          {title}
        </h2>
      </div>
      {/* Plain white body: description + CTA */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-border bg-card px-3 py-2.5 sm:px-4 sm:py-3">
        <p className="flex-1 line-clamp-3 text-xs leading-snug text-muted sm:text-sm">
          {description}
        </p>
        <div className="flex justify-end mt-2 sm:mt-3">
          <span className="text-xs font-medium text-highlight group-hover:underline sm:text-sm">
            Open →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function FeaturedPage() {
  const brand = useBrandContext();
  const subdomain = brand?.subdomain || "";

  const blogQuery =
    subdomain && subdomain !== "kavisha"
      ? `?subdomain=${encodeURIComponent(subdomain)}`
      : "";

  const definitions = [
    {
      id: "quiz",
      enabled: !!brand?.enableQuiz,
      title: brand?.quizName || "Quiz & surveys",
      description: "Take quizzes and surveys from this avatar.",
      href: "/quiz",
      icon: ClipboardList,
    },
    {
      id: "products",
      enabled: !!brand?.enableProducts,
      title: "Products",
      description: "Browse and shop products.",
      href: "/products",
      icon: Package,
    },
    {
      id: "services",
      enabled: !!brand?.enableBooking,
      title: "Services",
      description: "Book sessions and bookable services.",
      href: "/services",
      icon: CalendarClock,
    },
    {
      id: "blogs",
      enabled: !!brand?.enableBlogs,
      title: "Blog",
      description: "Read articles and updates.",
      href: `/blogs${blogQuery}`,
      icon: BookOpen,
    },
    {
      id: "jobs",
      enabled: !!brand?.enableJobs,
      title: "Jobs",
      description: "Find jobs and apply for them.",
      href: `/jobs`,
      icon: Briefcase,
    },
  ];

  const visible = definitions.filter((d) => d.enabled);

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-8 md:px-6 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-highlight">
          <Sparkles className="w-4 h-4" />
          Featured
        </div>
        <h1 className="font-baloo text-2xl font-bold tracking-wide text-foreground md:text-3xl">
          Explore {brand?.brandName || "this avatar"}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted md:text-base">
          Find all the featured services enabled by this avatar.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-medium text-foreground">Nothing featured yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            When this avatar enables quiz, products, bookable services, blog, or jobs
            in Sanity, they will show up here.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 list-none p-0 m-0 items-stretch">
          {visible.map((item) => (
            <li key={item.id} className="min-w-0 flex">
              <FeaturedCard
                href={item.href}
                title={item.title}
                description={item.description}
                icon={item.icon}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
