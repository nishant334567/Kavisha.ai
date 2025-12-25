"use client";
import { useState } from "react";

export default function Dropdown({
  options = ["abc@gmail.com"],
  selectedValue,
  onSelect,
  onProceed,
}) {
  const [selected, setSelected] = useState(selectedValue || "");

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
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
      <p className="text-gray-500 text-sm mb-3">Assign to menu</p>
      <div className="space-y-2 mb-4">
        {options.map((item, index) => {
          const value = typeof item === "string" ? item : item.value;
          const label = typeof item === "string" ? item : item.label;
          const isUnassigned =
            value === "" || value === "Unassigned" || label === "Unassigned";

          return (
            <div
              key={index}
              className={`flex items-center justify-between py-2 ${
                !isUnassigned ? "cursor-pointer hover:bg-gray-50" : ""
              }`}
              onClick={() => !isUnassigned && handleSelect(value)}
            >
              <span className="text-sm text-gray-900">{label}</span>
              {!isUnassigned && (
                <input
                  type="radio"
                  name="assign-option"
                  value={value}
                  checked={selected === value}
                  onChange={() => handleSelect(value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
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
