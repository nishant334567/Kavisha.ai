import { ChevronDown } from "lucide-react";

export default function FAQcard({ question, answer, open, onToggle }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] duration-300 ease-out ${
        open ? "border-highlight/30 shadow-sm" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-foreground transition-colors duration-300 ${
          open ? "bg-muted-bg/35" : "hover:bg-muted-bg/40"
        }`}
        aria-expanded={open}
      >
        <span>{question}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-[transform,color] duration-300 ease-out ${
            open ? "rotate-180 text-highlight" : "text-muted"
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`border-t border-border px-5 py-4 text-sm leading-relaxed text-muted transition-[opacity,transform] duration-300 ease-out ${
              open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            }`}
          >
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}
