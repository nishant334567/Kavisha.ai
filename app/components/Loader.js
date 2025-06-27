export default function Loader({ loadingMessage }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-amber-50 to-rose-50">
      {/* <p>{summary}</p> */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin"></div>
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
        <div className="text-emerald-700 font-medium">
          {loadingMessage ?? "Loading..."}
        </div>
      </div>
    </div>
  );
}
