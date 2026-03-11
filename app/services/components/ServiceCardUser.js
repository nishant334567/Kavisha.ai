"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";

export default function ServiceCardUser({ service, bookHref = "#" }) {
  const durationLabel = `${service?.duration || 0} ${
    service?.durationUnit || "Minutes"
  }`;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex justify-end">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#BEEAF6] bg-[#F2FCFF] px-2 py-0.5 text-[10px] font-medium text-[#2A7F98]">
          <Clock3 className="h-3 w-3" />
          {durationLabel}
        </span>
      </div>

      <div className="flex items-start gap-4">
        <div className="h-[92px] w-[128px] shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
          {service?.image ? (
            <img
              src={service.image}
              alt={service?.title || "Service"}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-2xl font-medium text-gray-900">
            {service?.title || "Untitled service"}
          </h3>
          {service?.subtitle ? (
            <p className="mt-0.5 text-xs text-gray-600">{service.subtitle}</p>
          ) : null}
          {service?.description ? (
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-500">
              {service.description}
            </p>
          ) : null}

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xl font-semibold text-[#1F2937]">
                Rs. {Math.round(service?.price || 0)}/-
              </p>
            </div>
            <Link
              href={bookHref}
              className="rounded-full bg-[#2D545E] px-6 py-1.5 text-xs font-semibold text-white hover:bg-[#264850]"
            >
              Book
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
