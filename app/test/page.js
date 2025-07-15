"use client";
import { useRef } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

export default function HorizontalScrollCards() {
  const containerRef = useRef(null);

  const scroll = (scrollOffset) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: scrollOffset, behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full">
      {/* Scroll Left Button */}
      <button
        onClick={() => scroll(-220)}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white shadow p-2 rounded-full z-10"
      >
        <ChevronLeft size={24} />
      </button>

      {/* Card Container */}
      <div
        ref={containerRef}
        className="flex overflow-x-auto no-scrollbar space-x-4 p-4 scroll-smooth"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="min-w-[200px] h-[150px] bg-blue-100 rounded-lg flex items-center justify-center text-lg font-semibold"
          >
            Card {i + 1}
          </div>
        ))}
      </div>

      {/* Scroll Right Button */}
      <button
        onClick={() => scroll(220)}
        className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white shadow p-2 rounded-full z-10"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
}
