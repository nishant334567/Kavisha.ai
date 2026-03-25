"use client";

import { Info } from "lucide-react";

export default function AdminUpdateNotice() {
  return (
    <div className="border-b border-border bg-muted-bg/80">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 text-sm text-foreground md:px-6">
        <Info className="h-4 w-4 shrink-0 text-highlight" />
        <p>
          Changes take about two minutes to reflect! Please check back in a while.
        </p>
      </div>
    </div>
  );
}
