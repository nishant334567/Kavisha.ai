export default function Loader({ loadingMessage }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-4 border-border"></div>
          <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-4 border-transparent border-t-highlight"></div>
        </div>
        <div className="text-sm font-medium text-highlight">
          {loadingMessage ?? "Loading..."}
        </div>
      </div>
    </div>
  );
}
