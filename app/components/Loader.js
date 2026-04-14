import { normalizeBrandHex } from "@/app/lib/brandTheme";

/** Same full-screen loader as before; pass `primaryHex` when you have a brand color for the ring + label. */
export default function Loader({ loadingMessage, primaryHex: primaryHexProp }) {
  const primaryHex = normalizeBrandHex(primaryHexProp);
  const spinStyle = primaryHex ? { borderTopColor: primaryHex } : undefined;
  const textStyle = primaryHex ? { color: primaryHex } : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-4 border-border" />
          <div
            className={`absolute inset-0 h-10 w-10 animate-spin rounded-full border-4 border-transparent ${
              !primaryHex ? "border-t-highlight" : ""
            }`}
            style={spinStyle}
          />
        </div>
        <div
          className={`text-sm font-medium ${!primaryHex ? "text-highlight" : ""}`}
          style={textStyle}
        >
          {loadingMessage ?? "Loading..."}
        </div>
      </div>
    </div>
  );
}
