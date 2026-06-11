"use client";

import { useEffect, useState } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

const btnPrimary =
  "rounded-lg bg-highlight px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const btnSecondary =
  "rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-50";

export default function WhatsAppConnect() {
  const brand = useBrandContext();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!brand) return;
    const phone = brand.whatsappPhoneNumber || "";
    const id = brand.whatsappCloudPhoneNumberId || "";
    setPhoneNumber(phone);
    setPhoneNumberId(id);
    setIsConnected(Boolean(phone.trim() && id.trim()));
  }, [brand]);

  if (!brand?.isBrandAdmin) return null;

  const fieldsLocked = isConnected || connecting;

  const handleConnect = async () => {
    const phone = phoneNumber.trim();
    const id = phoneNumberId.trim();
    if (!phone || !id || connecting) return;

    setConnecting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/update-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: brand.subdomain,
          whatsappPhoneNumber: phone,
          whatsappCloudPhoneNumberId: id,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to connect WhatsApp");
      }
      setIsConnected(true);
    } catch (err) {
      setError(err.message || "Failed to connect WhatsApp");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectConfirm = () => {
    setPhoneNumber("");
    setPhoneNumberId("");
    setIsConnected(false);
    setShowDisconnectDialog(false);
    setError("");
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium uppercase tracking-wider text-foreground">
            Connect to WhatsApp
          </span>
        </div>
        <div className="mt-3 space-y-3">
          <div className="space-y-1">
            <label
              htmlFor="whatsapp-phone-number"
              className="text-xs font-medium text-muted"
            >
              Phone number
            </label>
            <input
              id="whatsapp-phone-number"
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={fieldsLocked}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:bg-muted-bg disabled:text-muted"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="whatsapp-phone-number-id"
              className="text-xs font-medium text-muted"
            >
              Phone number ID
            </label>
            <input
              id="whatsapp-phone-number-id"
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              disabled={fieldsLocked}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:bg-muted-bg disabled:text-muted"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          {isConnected ? (
            <button
              type="button"
              onClick={() => setShowDisconnectDialog(true)}
              className={btnSecondary}
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={fieldsLocked || !phoneNumber.trim() || !phoneNumberId.trim()}
              className={btnPrimary}
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
          )}
        </div>
      </div>

      {showDisconnectDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="whatsapp-disconnect-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2
              id="whatsapp-disconnect-title"
              className="text-base font-semibold text-foreground"
            >
              Disconnect WhatsApp?
            </h2>
            <p className="mt-2 text-sm text-muted">
              Users will no longer get AI replies on this WhatsApp number.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDisconnectDialog(false)}
                className={btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnectConfirm}
                className={btnPrimary}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
