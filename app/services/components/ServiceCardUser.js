"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";

const CARD_GRADIENT =
  "linear-gradient(to right, #DBF8F8 0%, #DBF3F8 50%, #DBEEF8 100%)";

function stripHtml(html = "") {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function ServiceCardUser({ service, bookHref = "#" }) {
  if (!service) return null;

  const durationLabel = `${service?.duration || 0} ${
    service?.durationUnit || "Minutes"
  }`;
  const imageUrl = service?.image || null;
  const description =
    stripHtml(service?.description || "") ||
    service?.subtitle ||
    "This is a small description of the service or anything the admin wants to write to give the first impression.";

  return (
    <article className="flex items-stretch gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-4">
      <div className="w-[40%] shrink-0 max-w-[180px] self-stretch flex flex-col sm:w-[42%]">
        <Link href={bookHref} className="w-full block">
          <div className="w-full aspect-square rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center hover:opacity-90 transition-opacity">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={service?.title || "Service"}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                No image
              </div>
            )}
          </div>
        </Link>
        <div className="mt-auto w-full pt-2">
          <Link
            href={bookHref}
            className="inline-flex w-full items-center justify-center rounded-full px-2 py-2 text-[11px] font-medium leading-4 text-gray-900 shadow-sm transition-opacity hover:opacity-90 sm:text-xs"
            style={{ background: CARD_GRADIENT }}
          >
            Book now
          </Link>
        </div>
      </div>

      <div className="min-w-0 flex-1 self-stretch">
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="mb-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#BEEAF6] bg-[#F2FCFF] px-2 py-0.5 text-[10px] font-medium text-[#2A7F98]">
                <Clock3 className="h-3 w-3" />
                {durationLabel}
              </span>
            </div>
            <Link href={bookHref}>
              <h3 className="font-semibold text-xl hover:underline leading-tight text-gray-700">
                {service?.title || "Untitled service"}
              </h3>
            </Link>
            <p className="text-xs sm:text-sm text-gray-500 mt-1.5 line-clamp-4">
              {description}
            </p>

          </div>
          <div className="mt-2 pt-2">
            <div>
              <p className="font-bold text-gray-800 text-sm sm:text-base">
                Rs. {Math.round(service?.price || 0)}/-
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
