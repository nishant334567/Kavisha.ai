"use client";
import { useState, useEffect } from "react";

export default function Dropdown({
  options = ["abc@gmail.com"],
  selectedValue,
  onSelect,
  onProceed,
}) {
  const [selected, setSelected] = useState(selectedValue || "");

  useEffect(() => {
    // If selectedValue is empty, set to "Unassigned" for display
    // Otherwise use the actual value
    if (!selectedValue || selectedValue === "") {
      setSelected("Unassigned");
    } else {
      setSelected(selectedValue);
    }
  }, [selectedValue]);

  const handleSelect = (value) => {
    setSelected(value);
  };

  const handleProceed = () => {
    if (onSelect) {
      onSelect(selected);
    }
    if (onProceed) {
      onProceed(selected);
    }
  };

  return (
    <div className="min-w-0 max-w-full rounded-lg border border-border bg-card p-4 text-foreground shadow-md">
      <p className="mb-3 text-sm text-muted">Assign to menu</p>
      <div className="space-y-2 mb-4 min-w-0">
        {options.map((item, index) => {
          const value = typeof item === "string" ? item : item.value;
          const label = typeof item === "string" ? item : item.label;
          const isUnassigned =
            value === "" || value === "Unassigned" || label === "Unassigned";

          // Check if this option is selected
          const isSelected = isUnassigned
            ? selected === "Unassigned" ||
              selected === "" ||
              (!selectedValue && value === "Unassigned")
            : selected === value || selectedValue === value;

          return (
            <div
              key={index}
              className={`flex min-w-0 items-center justify-between rounded-md py-2 ${
                !isUnassigned ? "cursor-pointer hover:bg-muted-bg" : ""
              }`}
              onClick={() => !isUnassigned && handleSelect(value)}
            >
              <span className="min-w-0 flex-1 break-all pr-2 text-sm text-foreground">
                {label}
              </span>
              {!isUnassigned && (
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "border-highlight bg-highlight"
                      : "border-border bg-card"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-border pt-4">
        <button
          onClick={handleProceed}
          className="w-full rounded-lg bg-muted-bg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          Proceed
        </button>
      </div>
    </div>
  );
}
