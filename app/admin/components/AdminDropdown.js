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
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 min-w-0 max-w-full">
      <p className="text-gray-500 text-sm mb-3">Assign to menu</p>
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
              className={`flex items-center justify-between py-2 min-w-0 ${
                !isUnassigned ? "cursor-pointer hover:bg-gray-50" : ""
              }`}
              onClick={() => !isUnassigned && handleSelect(value)}
            >
              <span className="text-sm text-gray-900 break-all min-w-0 flex-1 pr-2">
                {label}
              </span>
              {!isUnassigned && (
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "border-purple-600 bg-purple-600"
                      : "border-gray-300 bg-white"
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
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={handleProceed}
          className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
        >
          Proceed
        </button>
      </div>
    </div>
  );
}
