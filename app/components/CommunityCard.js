"use client";

import { useState } from "react";
import CommunityPostDialog from "./CommunityPostDialog";
import ConfirmModal from "./ConfirmModal";
import { hexToRgba } from "@/app/lib/brandTheme";

export default function CommunityCard({
    name,
    description,
    date,
    requirement,
    onConnect,
    connectLabel = "Connect",
    isOwnPost = false,
    primaryBrandColor = null,
    secondaryBrandColor = null,
    showLookingForPill = true,
}) {
    const [showDialog, setShowDialog] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const isConnected = connectLabel === "Message";
    const requiresPayment = !isConnected && connectLabel === "Connect";

    const handleConnectClick = () => {
        if (isConnected) {
            onConnect?.();
            return true;
        }
        if (requiresPayment) {
            setShowConfirmModal(true);
            return false;
        }
        onConnect?.();
        return true;
    };

    const handleConfirmProceed = () => {
        onConnect?.();
        setShowConfirmModal(false);
        setShowDialog(false);
    };
    return (
        <>
            <div className="shadow-xl rounded-lg px-4 sm:px-6 md:px-8 py-4 border border-border flex flex-col h-full min-w-0 bg-card">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4 min-w-0">
                    <p
                        className={`text-xl sm:text-2xl md:text-3xl truncate sm:break-words ${!secondaryBrandColor ? "text-[#004A4E]" : ""}`}
                        style={secondaryBrandColor ? { color: secondaryBrandColor } : undefined}
                    >
                        {name}
                    </p>
                    {(isOwnPost || showLookingForPill) && (
                        <div className="inline-flex items-center gap-2 shrink-0 self-start">
                            {isOwnPost && (
                                <span
                                    className={
                                        secondaryBrandColor
                                            ? "rounded-full border px-2 sm:px-2.5 py-1 text-xs sm:text-sm"
                                            : "rounded-full border border-emerald-200 bg-emerald-50 px-2 sm:px-2.5 py-1 text-xs sm:text-sm text-emerald-700"
                                    }
                                    style={
                                        secondaryBrandColor
                                            ? {
                                                  borderColor: hexToRgba(secondaryBrandColor, 0.45),
                                                  backgroundColor: hexToRgba(secondaryBrandColor, 0.12),
                                                  color: secondaryBrandColor,
                                              }
                                            : undefined
                                    }
                                >
                                    You posted
                                </span>
                            )}
                            {showLookingForPill && (
                                <div className="inline-flex rounded-full border border-border bg-muted-bg overflow-hidden">
                                    <span className="px-2 sm:px-2.5 py-1 text-xs sm:text-sm text-foreground">Looking for</span>
                                    <span
                                        className={`px-2 sm:px-2.5 py-1 text-xs sm:text-sm bg-background ${!secondaryBrandColor ? "text-foreground" : ""}`}
                                        style={
                                            secondaryBrandColor
                                                ? {
                                                      color: secondaryBrandColor,
                                                      backgroundColor: hexToRgba(secondaryBrandColor, 0.14),
                                                  }
                                                : undefined
                                        }
                                    >
                                        {requirement || "—"}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <p className="text-xs text-muted font-extralight mb-4 flex-1 min-h-0 line-clamp-3">{description || ""}</p>
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mt-auto">
                    <p className="text-xs text-muted order-2 sm:order-1">{date || ""}</p>
                    <div className="flex items-center gap-2 order-1 sm:order-2 shrink-0">
                        {isConnected && !isOwnPost && (
                            <span
                                className={`text-xs sm:text-sm ${!secondaryBrandColor ? "text-emerald-600" : ""}`}
                                style={secondaryBrandColor ? { color: secondaryBrandColor } : undefined}
                            >
                                Already connected
                            </span>
                        )}
                        <button
                            type="button"
                            className={`rounded-full border border-border bg-muted-bg px-3 py-1.5 sm:px-4 text-sm hover:bg-border/50 transition-colors ${!primaryBrandColor ? "text-highlight" : ""}`}
                            style={primaryBrandColor ? { color: primaryBrandColor } : undefined}
                            onClick={() => setShowDialog(true)}
                        >
                            View
                        </button>
                        {!isOwnPost && (
                            <button
                                type="button"
                                className={`rounded-full text-white px-3 py-1.5 sm:px-4 text-sm transition-colors hover:opacity-90 ${!primaryBrandColor ? "bg-highlight" : ""}`}
                                style={primaryBrandColor ? { backgroundColor: primaryBrandColor } : undefined}
                                onClick={handleConnectClick}
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
                    onConnect={isOwnPost ? undefined : handleConnectClick}
                    connectLabel={connectLabel}
                    isOwnPost={isOwnPost}
                    primaryBrandColor={primaryBrandColor}
                    secondaryBrandColor={secondaryBrandColor}
                />
            )}
            <ConfirmModal
                isOpen={showConfirmModal}
                title="Proceed to payment to connect?"
                rows={[
                    { label: "Connecting with", value: requirement || "—" },
                    { label: "Amount", value: "Rs. 20/-*", note: "*Incl. taxes", isAmount: true },
                ]}
                onConfirm={handleConfirmProceed}
                onCancel={() => setShowConfirmModal(false)}
                confirmLabel="Proceed"
                cancelLabel="Cancel"
            />
        </>
    );
}