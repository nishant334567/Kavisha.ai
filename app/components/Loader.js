export default function Loader({ loadingMessage }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 w-10 h-10 border-4 border-transparent border-t-[#004A4E] rounded-full animate-spin"></div>
        </div>
        <div className="text-[#004A4E] text-sm font-medium">
          {loadingMessage ?? "Loading..."}
        </div>
      </div>
    </div>
  );
}
