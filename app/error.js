"use client";

export default function Error({ error, reset }) {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        {error?.digest ? `Error ID: ${error.digest}` : error?.message || "Please try again."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-[#2D545E] px-4 py-2 text-sm font-medium text-white hover:bg-[#264850]"
      >
        Try again
      </button>
    </div>
  );
}
