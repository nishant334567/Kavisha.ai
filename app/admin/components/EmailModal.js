"use client";

import { useState, useCallback, useMemo } from "react";
import EmailEditor from "./EmailEditor";
import EmailConfirmRecipients from "./EmailConfirmRecipients";

function getBrandBaseUrl(brand) {
  const sub = String(brand || "kavisha").trim().toLowerCase();
  if (sub === "kavisha") return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL : "https://kavisha.ai";
  return `https://${sub}.kavisha.ai`;
}

/** Builds final email HTML: title, subtitle, center (logo, brand name, date, Powered by, Talk to me, My Community), body. Inline styles for email clients. */
function buildEmailHtml({ title, subtitle, bodyHtml, brand = "kavisha", logoUrl }) {
  const brandName = String(brand).trim() ? String(brand).toUpperCase() : "KAVISHA";
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const baseUrl = getBrandBaseUrl(brand);
  const chatsUrl = `${baseUrl}/chats`;
  const communityUrl = `${baseUrl}/community`;
  const btnStyle = "display:inline-block;padding:8px 10px;margin:4px;background:#004A4E;color:#fff;text-decoration:none;border-radius:6px;font-size:10px;font-weight:200;";

  const titleBlock =
    title?.trim() ?
      `<h1 style="margin:0 0 12px 0;font-size:28px;font-weight:700;color:#1f2937;line-height:1.3;text-align:left;">${escapeHtml(title.trim())}</h1>`
      : "";
  const subtitleBlock =
    subtitle?.trim() ?
      `<p style="margin:0 0 20px 0;font-size:18px;font-weight:400;color:#374151;line-height:1.5;text-align:left;">${escapeHtml(subtitle.trim())}</p>`
      : "";
  const separator = `<hr style="margin:0 0 20px 0;border:0;border-top:1px solid #e5e7eb;" />`;
  const logoImg =
    logoUrl && String(logoUrl).trim()
      ? `<img src="${escapeAttr(String(logoUrl).trim())}" alt="${escapeHtml(brandName)}" width="40" height="40" style="width:40px;height:40px;border-radius:50%;display:block;object-fit:cover;" />`
      : `<div style="width:40px;height:40px;border-radius:50%;background:#e5e7eb;"></div>`;
  const centerSection = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="1" style="vertical-align:top;padding-right:12px;">
          ${logoImg}
        </td>
        <td style="vertical-align:top;">
          <table cellpadding="0" cellspacing="0">
            <tr><td style="font-size:14px;font-weight:700;color:#1f2937;line-height:1.3;">${escapeHtml(brandName)}</td></tr>
            <tr><td style="font-size:12px;color:#6b7280;line-height:1.4;padding-top:2px;">${escapeHtml(dateStr)}</td></tr>
          </table>
        </td>
        <td align="right" style="vertical-align:top;text-align:right;">
          <table cellpadding="0" cellspacing="0" align="right" style="margin-left:auto;">
            <tr><td style="padding-top:6px;">
              <a href="${escapeAttr(chatsUrl)}" style="${btnStyle}">Go to Avataar</a>
              <a href="${escapeAttr(communityUrl)}" style="${btnStyle}">Community</a>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>`;
  const bodyBlock = bodyHtml?.trim() ? bodyHtml : "<p></p>";

  return [
    "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" align=\"left\" style=\"max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:8px;border-top:2px solid #93c5fd;border-bottom:2px solid #93c5fd;text-align:left;\">",
    "<tr><td align=\"left\" style=\"padding:24px;background:#fff;border-radius:6px;text-align:left;\">",
    titleBlock,
    subtitleBlock,
    separator,
    centerSection,
    "<div style=\"font-size:15px;font-weight:400;color:#374151;line-height:1.6;text-align:left;\">",
    bodyBlock,
    "</div>",
    "</td></tr>",
    "</table>",
  ].join("");
}

function escapeHtml(text) {
  const el = typeof document !== "undefined" ? document.createElement("div") : null;
  if (el) {
    el.textContent = text;
    return el.innerHTML;
  }
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeRecipients(toEmails) {
  if (!Array.isArray(toEmails)) return [];
  return toEmails
    .filter((e) => e != null && (typeof e === "string" ? String(e).trim() : e.email))
    .map((e) =>
      typeof e === "string"
        ? { email: String(e).trim(), name: String(e).trim(), lastEmail: null }
        : { email: String(e.email || "").trim(), name: e.name ?? e.email, lastEmail: e.lastEmail ?? null }
    )
    .filter((r) => r.email);
}

export default function EmailModal({ onClose, toEmails = [], brand, logoUrl }) {
  const [step, setStep] = useState("compose");
  const [subject, setSubject] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);

  const recipients = useMemo(() => normalizeRecipients(toEmails), [toEmails]);
  const brandVal = brand || "kavisha";

  const handleHeaderChange = useCallback(({ title, description }) => {
    setSubject(title ?? "");
    setSubtitle(description ?? "");
  }, []);

  const fullBodyHtml = buildEmailHtml({
    title: subject,
    subtitle,
    bodyHtml: htmlContent,
    brand: brandVal,
    logoUrl,
  });

  const canGoNext = recipients.length > 0 && subject.trim() && htmlContent.trim();

  const goToConfirm = () => {
    setSelectedEmails(recipients.map((r) => r.email));
    setStep("confirm");
  };

  const handleSend = async () => {
    if (!selectedEmails.length || !subject.trim() || !htmlContent.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/send-bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: selectedEmails.map((email) => ({ email, name: email })),
          subject: subject.trim(),
          body: fullBodyHtml,
          brand: brandVal,
        }),
      });
      const data = await res.json();
      if (data.success) onClose();
      else alert(data.error || "Failed to send");
    } catch (e) {
      alert("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handlePreview = () => {
    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preview</title><body style="margin:0;padding:20px;background:#e5e7eb;">${fullBodyHtml}</body></html>`;
    const w = window.open("", "_blank");
    if (w) w.document.write(doc);
  };

  const toggleRecipient = (email) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const selectAllRecipients = () => {
    const allEmails = recipients.map((r) => r.email);
    setSelectedEmails((prev) => (prev.length === allEmails.length ? [] : allEmails));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      {step === "compose" && (
        <>
          <header className="flex flex-shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
              <span>Saved</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToConfirm}
                disabled={!canGoNext}
                className="px-4 py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                type="button"
                onClick={handlePreview}
                className="rounded-lg bg-muted-bg px-4 py-2 text-sm font-medium text-highlight hover:bg-card"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                Cancel
              </button>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <EmailEditor
              value={htmlContent}
              onChange={setHtmlContent}
              brand={brand}
              onHeaderChange={handleHeaderChange}
            />
          </div>
        </>
      )}

      {step === "confirm" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="flex min-h-0 max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
            <EmailConfirmRecipients
              recipients={recipients}
              selectedEmails={selectedEmails}
              onToggle={toggleRecipient}
              onSelectAll={selectAllRecipients}
              onCancel={() => setStep("compose")}
              onConfirm={handleSend}
              onPreview={handlePreview}
              sending={sending}
            />
          </div>
        </div>
      )}
    </div>
  );
}
