"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white px-6 py-16 text-slate-900 antialiased">
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-slate-600">
            {error?.message || "The app hit a critical error. You can try reloading."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-[#2D545E] px-4 py-2 text-sm font-medium text-white hover:bg-[#264850]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
