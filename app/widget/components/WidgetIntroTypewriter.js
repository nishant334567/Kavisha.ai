"use client";

import { useEffect, useRef, useState } from "react";
import FormatText from "@/app/components/FormatText";

/** ~12ms/char (~80/s) — was 28ms; keeps typewriter feel without a long first reply. */
const MS_PER_CHAR = 12;

/**
 * Letter-by-letter intro for a newly created widget session only (parent gates when to mount).
 * Plain text while typing; swaps to FormatText when done.
 */
export default function WidgetIntroTypewriter({
  text,
  scrollRef,
  onComplete,
  blackBody = false,
}) {
  const full = String(text ?? "");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const [n, setN] = useState(0);
  const [done, setDone] = useState(!full);
  const tickRef = useRef(null);

  useEffect(() => {
    if (!full) {
      setN(0);
      setDone(true);
      onCompleteRef.current?.();
      return;
    }
    setN(0);
    setDone(false);
    let i = 0;
    const step = () => {
      i += 1;
      setN(i);
      if (i >= full.length) {
        setDone(true);
        onCompleteRef.current?.();
        return;
      }
      tickRef.current = setTimeout(step, MS_PER_CHAR);
    };
    tickRef.current = setTimeout(step, MS_PER_CHAR);
    return () => clearTimeout(tickRef.current);
  }, [full]);

  useEffect(() => {
    if (!done && n > 0) {
      queueMicrotask(() => {
        scrollRef?.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [n, done, scrollRef]);

  return (
    <div className="min-w-0 max-w-full overflow-hidden [word-break:break-word] [overflow-wrap:anywhere] [&_.prose]:max-w-none [&_.prose]:break-words [&_.prose_p]:leading-relaxed [&_a]:break-all [&_code]:break-all">
      {done ? (
        <FormatText text={full} blackBody={blackBody} />
      ) : (
        <span
          className={
            blackBody
              ? "whitespace-pre-wrap text-[#000000]"
              : "whitespace-pre-wrap text-foreground"
          }
        >
          {full.slice(0, n)}
          <span
            className={
              blackBody
                ? "ml-0.5 inline-block h-3.5 w-px animate-pulse bg-[#000000]/45 align-middle"
                : "ml-0.5 inline-block h-3.5 w-px animate-pulse bg-foreground/55 align-middle"
            }
            aria-hidden
          />
        </span>
      )}
    </div>
  );
}
