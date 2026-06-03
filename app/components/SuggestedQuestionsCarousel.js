"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { normalizeSuggestedQuestions } from "@/app/lib/suggestedQuestions";

const SWIPE_THRESHOLD_PX = 40;
const CAROUSEL_DOT_ACTIVE_WIDTH_PX = 24;
const CAROUSEL_DOT_STEP_PX = 16;
const DEFAULT_ACCENT = "#2d545e";
const STAGGER_MS = 40;

function questionsAsSinglePages(questions) {
  return normalizeSuggestedQuestions(questions).map((q) => [q]);
}

function SuggestedQuestionsMobileCarousel({
  questions,
  onSelect,
  disabled,
  className,
  sectionLabel,
}) {
  const touchStartRef = useRef(null);
  const [pageIndex, setPageIndex] = useState(0);

  const pages = useMemo(() => questionsAsSinglePages(questions), [questions]);
  const pageCount = pages.length;
  const safePageIndex =
    pageCount > 0 ? Math.max(0, Math.min(pageIndex, pageCount - 1)) : 0;

  useEffect(() => {
    setPageIndex(0);
  }, [questions]);

  useEffect(() => {
    if (pageIndex > pageCount - 1 && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || pageCount <= 1) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (
        Math.abs(dx) < SWIPE_THRESHOLD_PX ||
        Math.abs(dx) < Math.abs(dy)
      ) {
        return;
      }
      setPageIndex((idx) => {
        if (dx < 0) return Math.min(pageCount - 1, idx + 1);
        return Math.max(0, idx - 1);
      });
    },
    [pageCount],
  );

  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  if (pageCount === 0) return null;

  return (
    <div className={`shrink-0 md:hidden ${className}`.trim()}>
      <div className="flex flex-col gap-2.5">
        {sectionLabel ? (
          <p className="text-xs font-medium text-muted">{sectionLabel}</p>
        ) : null}
        <div className="mx-auto flex w-full max-w-full items-center gap-2 sm:gap-2.5">
          <div
            className="relative z-10 min-h-12 min-w-0 flex-1 touch-pan-y overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
          >
            <div
              className="grid grid-flow-col auto-cols-[100%] transition-transform duration-300 ease-out"
              style={{
                transform: `translateX(-${safePageIndex * 100}%)`,
              }}
            >
              {pages.map((pageQuestions, pageIdx) => (
                <div key={`suggested-page-${pageIdx}`} className="w-full min-w-0">
                  {pageQuestions.map((q) => (
                    <button
                      key={`suggested-q-${pageIdx}-${q}`}
                      type="button"
                      onClick={() => onSelect?.(q)}
                      disabled={disabled}
                      className="flex min-h-12 w-full items-start rounded-2xl border border-border/45 bg-background px-4 py-2.5 text-left font-baloo text-sm font-normal leading-relaxed text-foreground shadow-sm transition-colors hover:bg-muted-bg disabled:opacity-50 dark:border-border/40"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="flex items-center gap-1.5">
                {pages.map((_, i) => (
                  <button
                    key={`suggested-dot-${i}`}
                    type="button"
                    aria-label={`Go to suggested questions page ${i + 1}`}
                    onClick={() => setPageIndex(i)}
                    className="h-2.5 w-2.5 rounded-full bg-[#d1d1d1] transition-colors hover:bg-[#bcbcbc]"
                  />
                ))}
              </div>
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 h-2.5 rounded-full bg-[#9d9d9d] transition-transform duration-300 ease-out"
                style={{
                  width: CAROUSEL_DOT_ACTIVE_WIDTH_PX,
                  transform: `translateX(${safePageIndex * CAROUSEL_DOT_STEP_PX}px)`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestedQuestionsDesktopPanel({
  questions,
  onSelect,
  disabled,
  className,
  accentColor,
  sectionLabel,
}) {
  const list = useMemo(() => normalizeSuggestedQuestions(questions), [questions]);
  if (list.length === 0) return null;

  const accent = accentColor || DEFAULT_ACCENT;

  return (
    <div
      className={`relative hidden shrink-0 flex-col md:flex ${className}`.trim()}
    >
      {sectionLabel ? (
        <p className="mb-1.5 shrink-0 text-[13px] font-semibold text-foreground">
          {sectionLabel}
        </p>
      ) : null}

      <div className="flex max-w-full flex-col items-start gap-1.5 overflow-x-auto scrollbar-thin">
        {list.map((q, i) => (
          <button
            key={`desktop-prompt-${i}`}
            type="button"
            onClick={() => onSelect?.(q)}
            disabled={disabled}
            className="suggested-prompt-enter group relative inline-flex w-max items-center gap-1.5 rounded-lg border border-border/30 bg-background/95 px-3 py-1.5
             text-left transition-[border-color,box-shadow] duration-200 hover:border-border/50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card/95"
            style={{ animationDelay: `${i * STAGGER_MS}ms` }}
          >
            <span
              className="pointer-events-none absolute inset-y-1 left-0 w-0.5 scale-y-0 rounded-r-full opacity-0 transition-all duration-200 group-hover:scale-y-100 group-hover:opacity-100"
              style={{ background: accent }}
              aria-hidden
            />
            <span className="whitespace-nowrap font-baloo text-[13.5px] font-normal leading-snug text-foreground/90 transition-colors group-hover:text-foreground">
              {q}
            </span>
            <ArrowUpRight
              className="h-3 w-3 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-70"
              style={{ color: accent }}
              strokeWidth={2.2}
              aria-hidden
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Suggested questions: widget-style carousel on mobile; stacked prompts on desktop.
 * Both variants mount (CSS `md:hidden` / `md:flex`) to avoid layout shift on resize.
 */
export default function SuggestedQuestionsCarousel({
  questions = [],
  onSelect,
  disabled = false,
  className = "",
  accentColor,
  sectionLabel = "Suggested questions",
}) {
  const list = normalizeSuggestedQuestions(questions);
  if (list.length === 0) return null;

  return (
    <>
      <SuggestedQuestionsMobileCarousel
        questions={list}
        onSelect={onSelect}
        disabled={disabled}
        className={className}
        sectionLabel={sectionLabel}
      />
      <SuggestedQuestionsDesktopPanel
        questions={list}
        onSelect={onSelect}
        disabled={disabled}
        className={className}
        accentColor={accentColor}
        sectionLabel={sectionLabel}
      />
    </>
  );
}
