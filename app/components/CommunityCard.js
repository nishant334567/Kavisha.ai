export default function CommunityCard({ name, description, date, requirement, onConnect, connectLabel = "Connect" }) {
    const isConnected = connectLabel === "Message";
    return (
        <div className="shadow-md rounded-lg p-4 font-fredoka space-y-4">
            <div className="flex justify-between items-start gap-2">
                <p className="text-3xl text-[#3D5E6B]">{name}</p>
                <div className="inline-flex rounded-full border border-gray-200 bg-white shrink-0">
                    <span className="px-2.5 py-1 text-sm text-gray-700">Looking for</span>
                    <span className="px-2.5 py-1 text-sm text-gray-800 bg-teal-100/80">{requirement || "—"}</span>
                </div>
            </div>
            <p className="text-md text-gray-600 font-extralight">{description || ""}</p>
            <div className="flex justify-between items-center">
                <p>{date || ""}</p>
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