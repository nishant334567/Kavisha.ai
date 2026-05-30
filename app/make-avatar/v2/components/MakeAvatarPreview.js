"use client";

import { Maximize2, Send, X } from "lucide-react";
import { normalizeBrandHex } from "@/app/lib/brandTheme";

export default function MakeAvatarPreview({ brandName, primaryColor }) {
  const primaryHex = normalizeBrandHex(primaryColor) || "#2d545e";
  const label = String(brandName || "").trim() || "Your AI";
  const headerTitle = `${label}'s AI Chat`;

  return (
    <div className="flex h-full min-h-[480px] w-full flex-col overflow-hidden bg-card">
      <div
        className="relative flex w-full shrink-0 items-center border-b border-black/15 px-1 py-3"
        style={{ backgroundColor: primaryHex }}
      >
        <div className="flex w-full min-w-0 items-center justify-between gap-2 px-2">
          <span className="min-w-0 truncate text-sm font-semibold tracking-tight text-white">
            {headerTitle}
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            <span className="rounded-full p-1.5 text-white/90">
              <Maximize2 className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="rounded-full p-1.5 text-white/90">
              <X className="h-5 w-5" strokeWidth={2} />
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-4 pt-2">
        <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto rounded-b-xl bg-muted-bg/20 p-3 dark:bg-muted-bg/10">
          <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-md bg-card px-4 py-2.5 text-sm text-foreground shadow-sm dark:bg-card/90">
            Say hi to start.
          </div>
        </div>

        <div className="relative shrink-0 pt-1">
          <div className="w-full rounded-full border border-border bg-background px-4 py-2.5 pr-11 text-sm text-muted shadow-sm">
            Message…
          </div>
          <span className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-foreground opacity-35">
            <Send className="h-3.5 w-3.5" />
          </span>
        </div>
        <p
          className="mt-2 shrink-0 pb-0.5 text-center text-xs"
          style={{ color: primaryHex }}
        >
          Powered by{" "}
          <span className="font-semibold underline-offset-2">Kavisha</span>
        </p>
      </div>
    </div>
  );
}
