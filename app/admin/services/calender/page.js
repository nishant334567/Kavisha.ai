"use client";

import { useEffect, useState } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { Plus, Save, X } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── shared class strings ──────────────────────────────────────────────────────
const card = "rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4";
const inputCls = [
  "rounded-lg border border-gray-200 dark:border-gray-700",
  "bg-white dark:bg-gray-800",
  "px-2.5 py-1.5 text-sm text-gray-800 dark:text-gray-200",
  "focus:outline-none focus:ring-2 focus:ring-[#2D545E]/30",
  "transition-colors",
].join(" ");
const ghostBtn = "flex items-center gap-1 text-xs font-medium text-[#2D545E] dark:text-teal-400 hover:underline transition-colors";
const removeBtn = "text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors";

export default function CalendarPage() {
  const brandContext = useBrandContext();
  const brand = brandContext?.subdomain;

  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!brand) return;
    fetch(`/api/admin/booking-availability?brand=${brand}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        setWeeklySchedule(data.weeklySchedule ?? []);
        setOverrides(data.dateOverrides ?? []);
      });
  }, [brand]);

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!brand) return;
    setSaving(true);
    await fetch(`/api/admin/booking-availability?brand=${brand}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklySchedule, dateOverrides: overrides }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ── weekly helpers ────────────────────────────────────────────────────────
  const toggleDay = (day) =>
    setWeeklySchedule((p) => p.map((d) => d.day === day ? { ...d, enabled: !d.enabled } : d));

  const addInterval = (day) =>
    setWeeklySchedule((p) =>
      p.map((d) => d.day === day ? { ...d, intervals: [...d.intervals, { start: "09:00", end: "17:00" }] } : d)
    );

  const removeInterval = (day, ivIdx) =>
    setWeeklySchedule((p) =>
      p.map((d) => d.day === day ? { ...d, intervals: d.intervals.filter((_, i) => i !== ivIdx) } : d)
    );

  const updateInterval = (day, ivIdx, field, value) =>
    setWeeklySchedule((p) =>
      p.map((d) =>
        d.day === day
          ? { ...d, intervals: d.intervals.map((iv, i) => i === ivIdx ? { ...iv, [field]: value } : iv) }
          : d
      )
    );

  // ── override helpers ──────────────────────────────────────────────────────
  const addOverride = () => {
    const today = new Date().toISOString().split("T")[0];
    setOverrides((p) => [...p, { date: today, isClosed: false, intervals: [] }]);
  };

  const removeOverride = (ovIdx) =>
    setOverrides((p) => p.filter((_, i) => i !== ovIdx));

  const updateOverride = (ovIdx, field, value) =>
    setOverrides((p) => p.map((o, i) => i === ovIdx ? { ...o, [field]: value } : o));

  const addOverrideInterval = (ovIdx) =>
    setOverrides((p) =>
      p.map((o, i) => i === ovIdx ? { ...o, intervals: [...o.intervals, { start: "09:00", end: "17:00" }] } : o)
    );

  const removeOverrideInterval = (ovIdx, ivIdx) =>
    setOverrides((p) =>
      p.map((o, i) => i === ovIdx ? { ...o, intervals: o.intervals.filter((_, j) => j !== ivIdx) } : o)
    );

  const updateOverrideInterval = (ovIdx, ivIdx, field, value) =>
    setOverrides((p) =>
      p.map((o, i) =>
        i === ovIdx
          ? { ...o, intervals: o.intervals.map((iv, j) => j === ivIdx ? { ...iv, [field]: value } : iv) }
          : o
      )
    );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Availability</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your weekly open hours and date-specific overrides.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2D545E] hover:bg-[#24444d] dark:bg-teal-700 dark:hover:bg-teal-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
          </button>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* ── Left: Weekly Schedule ──────────────────────────────── */}
          <section>
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Weekly Schedule</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Recurring hours applied every week.</p>
            </div>

            <div className="space-y-2">
              {weeklySchedule.map((dayItem) => (
                <div key={dayItem.day} className={card}>

                  {/* Day toggle row */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={dayItem.enabled}
                        onChange={() => toggleDay(dayItem.day)}
                        className="h-4 w-4 rounded accent-[#2D545E]"
                      />
                      <span className={`text-sm font-medium w-24 ${dayItem.enabled ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-600"}`}>
                        {DAYS[dayItem.day]}
                      </span>
                    </label>

                    {dayItem.enabled && (
                      <button type="button" onClick={() => addInterval(dayItem.day)} className={ghostBtn}>
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    )}
                  </div>

                  {/* Intervals */}
                  {dayItem.enabled && (
                    <div className="mt-3 space-y-2 pl-7">
                      {dayItem.intervals.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-600">No intervals — click Add above.</p>
                      ) : (
                        dayItem.intervals.map((iv, ivIdx) => (
                          <div key={ivIdx} className="flex items-center gap-2">
                            <input type="time" value={iv.start} onChange={(e) => updateInterval(dayItem.day, ivIdx, "start", e.target.value)} className={inputCls} />
                            <span className="text-xs text-gray-400 dark:text-gray-600">–</span>
                            <input type="time" value={iv.end} onChange={(e) => updateInterval(dayItem.day, ivIdx, "end", e.target.value)} className={inputCls} />
                            <button type="button" onClick={() => removeInterval(dayItem.day, ivIdx)} className={removeBtn}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {!dayItem.enabled && (
                    <p className="mt-1 pl-7 text-xs text-gray-400 dark:text-gray-600">Unavailable</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── Right: Date Overrides ──────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Date Overrides</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Custom hours for specific dates (next 60 days).</p>
              </div>
              <button
                type="button"
                onClick={addOverride}
                className="inline-flex items-center gap-1 rounded-xl border border-[#2D545E] dark:border-teal-600 px-3 py-1.5 text-xs font-medium text-[#2D545E] dark:text-teal-400 hover:bg-[#2D545E]/5 dark:hover:bg-teal-900/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add date
              </button>
            </div>

            {overrides.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">No overrides yet.</p>
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                  Add a date to set custom hours or mark it as closed.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {overrides.map((ov, ovIdx) => (
                  <div key={ovIdx} className={card}>

                    {/* Override header */}
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="date"
                        value={ov.date}
                        onChange={(e) => updateOverride(ovIdx, "date", e.target.value)}
                        className={inputCls}
                      />

                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={ov.isClosed}
                          onChange={(e) => updateOverride(ovIdx, "isClosed", e.target.checked)}
                          className="h-4 w-4 rounded accent-red-500"
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Closed all day</span>
                      </label>

                      <button type="button" onClick={() => removeOverride(ovIdx)} className={`${removeBtn} ml-auto`}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Intervals (hidden when closed) */}
                    {!ov.isClosed && (
                      <div className="mt-3 space-y-2 pl-1">
                        {ov.intervals.length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-600">No intervals yet.</p>
                        ) : (
                          ov.intervals.map((iv, ivIdx) => (
                            <div key={ivIdx} className="flex items-center gap-2">
                              <input type="time" value={iv.start} onChange={(e) => updateOverrideInterval(ovIdx, ivIdx, "start", e.target.value)} className={inputCls} />
                              <span className="text-xs text-gray-400 dark:text-gray-600">–</span>
                              <input type="time" value={iv.end} onChange={(e) => updateOverrideInterval(ovIdx, ivIdx, "end", e.target.value)} className={inputCls} />
                              <button type="button" onClick={() => removeOverrideInterval(ovIdx, ivIdx)} className={removeBtn}>
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                        <button type="button" onClick={() => addOverrideInterval(ovIdx)} className={`${ghostBtn} mt-1`}>
                          <Plus className="w-3.5 h-3.5" /> Add interval
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
