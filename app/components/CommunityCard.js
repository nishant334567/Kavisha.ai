"use client";

import { useState } from "react";
import CommunityPostDialog from "./CommunityPostDialog";

export default function CommunityCard({ name, description, date, requirement, onConnect, connectLabel = "Connect", isOwnPost = false }) {
    const [showDialog, setShowDialog] = useState(false);
    const isConnected = connectLabel === "Message";
    return (
        <>
            <div className="shadow-xl rounded-lg px-4 sm:px-6 md:px-8 py-4 font-fredoka border border-border flex flex-col h-full min-w-0 bg-card">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4 min-w-0">
                    <p className="text-xl sm:text-2xl md:text-3xl text-[#3D5E6B] truncate sm:break-words">{name}</p>
                    <div className="inline-flex items-center gap-2 shrink-0 self-start">
                        {isOwnPost && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 sm:px-2.5 py-1 text-xs sm:text-sm text-emerald-700"
                            >You posted</span>
                        )}
                        <div className="inline-flex rounded-full border border-border bg-muted-bg overflow-hidden">
                            <span className="px-2 sm:px-2.5 py-1 text-xs sm:text-sm text-foreground">Looking for</span>
                            <span className="px-2 sm:px-2.5 py-1 text-xs sm:text-sm text-foreground bg-teal-100/80">{requirement || "—"}</span>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-muted font-extralight mb-4 flex-1 min-h-0 line-clamp-3">{description || ""}</p>
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mt-auto">
                    <p className="text-xs text-muted order-2 sm:order-1">{date || ""}</p>
                    <div className="flex items-center gap-2 order-1 sm:order-2 shrink-0">
                        {isConnected && !isOwnPost && <span className="text-xs sm:text-sm text-emerald-600">Already connected</span>}
                        <button
                            type="button"
                            className="rounded-full border border-border bg-muted-bg text-foreground px-3 py-1.5 sm:px-4 text-sm hover:bg-border/50 transition-colors"
                            onClick={() => setShowDialog(true)}
                        >
                            View
                        </button>
                        {!isOwnPost && (
                            <button
                                type="button"
                                className="rounded-full bg-[#3D5E6B] text-white px-3 py-1.5 sm:px-4 text-sm hover:bg-[#2d4e5b] transition-colors"
                                onClick={() => onConnect?.()}
                            >
                                {connectLabel}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {showDialog && (
                <CommunityPostDialog
                    name={name}
                    description={description}
                    date={date}
                    requirement={requirement}
                    onClose={() => setShowDialog(false)}
                    onConnect={isOwnPost ? undefined : onConnect}
                    connectLabel={connectLabel}
                    isOwnPost={isOwnPost}
                />
            )}
        </>
    );
}