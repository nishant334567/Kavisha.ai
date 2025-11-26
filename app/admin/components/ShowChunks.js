import { useEffect, useState } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function ShowChunks({ docid, isOpen, onClose }) {
  const [allChunks, setAllChunks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const brandContext = useBrandContext();

  useEffect(() => {
    if (!isOpen || !docid || !brandContext?.subdomain) return;

    const fetchAllChunks = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/admin/fetch-doc-chunks?docid=${docid}&brand=${brandContext.subdomain}`
        );
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        // API returns { chunks, totalChunks }
        setAllChunks(data.chunks || []);
      } catch (err) {
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllChunks();
  }, [isOpen, docid, brandContext?.subdomain]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">
            Document chunks
          </h2>
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-xs text-gray-500">Loading chunks…</p>
          ) : allChunks && allChunks.length > 0 ? (
            allChunks.map((item) => (
              <div
                key={item?.id}
                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Chunk #{item?.chunkIndex}</span>
                  <span className="font-mono text-[10px] text-gray-400">
                    {item.id}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-gray-800">
                  {item.text}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  {item?.text?.split(" ")?.length || 0} words
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500">
              No chunks found for this document.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
