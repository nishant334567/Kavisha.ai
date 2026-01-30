export default function CommunityCard({ name, description, date, requirement, onConnect, connectLabel = "Connect" }) {
    const isConnected = connectLabel === "Message";
    return (
        <div className="shadow-xl rounded-lg px-8 py-4 font-fredoka border border-gray-200 flex flex-col h-full">
            <div className="flex justify-between items-start gap-2 mb-4">
                <p className="text-3xl text-[#3D5E6B]">{name}</p>
                <div className="inline-flex rounded-full border border-gray-200 bg-white shrink-0 overflow-hidden">
                    <span className="px-2.5 py-1 text-sm text-gray-700">Looking for</span>
                    <span className="px-2.5 py-1 text-sm text-gray-800 bg-teal-100/80">{requirement || "—"}</span>
                </div>
            </div>
            <p className="text-xs text-gray-500 font-extralight mb-4 flex-1">{description || ""}</p>
            <div className="flex justify-between items-center mt-auto">
                <p className="text-xs text-gray-500">{date || ""}</p>
                <div className="flex items-center gap-2">
                    {isConnected && <span className="text-sm text-emerald-600">Already connected</span>}
                    <button
                        type="button"
                        className="rounded-full bg-[#3D5E6B] text-white px-4 py-1 hover:bg-[#2d4e5b] transition-colors"
                        onClick={() => onConnect?.()}
                    >
                        {connectLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}