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
      className="group font-baloo tracking-[0.06em] flex flex-col w-full h-full min-h-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md hover:border-[#00888E]/40 transition-all"
    >
      {/* Colored strip: icon + title (stacked for 2-col grid cells) */}
      <div className="px-3 py-3 sm:px-4 sm:py-3 flex flex-col gap-2 min-h-0 bg-gradient-to-r from-[#DBF8F8] via-[#DBF3F8] to-[#DBEEF8]">
        <Icon
          className="h-5 w-5 shrink-0 text-gray-900/80 group-hover:text-[#00888E] transition-colors"
          strokeWidth={2}
          aria-hidden
        />
        <h2 className="text-sm sm:text-base font-medium text-gray-900 leading-snug group-hover:text-[#00888E] transition-colors">
          {title}
        </h2>
      </div>
      {/* Plain white body: description + CTA */}
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-white border-t border-gray-100 flex flex-col flex-1 min-h-0">
        <p className="text-xs sm:text-sm text-gray-600 leading-snug line-clamp-3 flex-1">
          {description}
        </p>
        <div className="flex justify-end mt-2 sm:mt-3">
          <span className="text-xs sm:text-sm font-medium text-[#00888E] group-hover:underline">
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
        <div className="inline-flex items-center gap-2 text-[#00888E] text-sm font-medium mb-2">
          <Sparkles className="w-4 h-4" />
          Featured
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-baloo tracking-wide">
          Explore {brand?.brandName || "this avatar"}
        </h1>
        <p className="text-gray-600 mt-2 text-sm md:text-base max-w-xl">
          Find all the featured services enabled by this avatar.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-10 text-center">
          <p className="text-gray-700 font-medium">Nothing featured yet</p>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
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
