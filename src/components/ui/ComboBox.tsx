"use client";

import { useState, useRef, useEffect, forwardRef } from "react";
import Tooltip from "./Tooltip";

type OptionItem = string | { value: string; label: string };

interface ComboBoxProps {
  label?: string;
  error?: string;
  tooltip?: string;
  isRequired?: boolean;
  options: OptionItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function optionValue(opt: OptionItem): string {
  return typeof opt === "string" ? opt : opt.value;
}

function optionLabel(opt: OptionItem): string {
  return typeof opt === "string" ? opt : opt.label;
}

const ComboBox = forwardRef<HTMLInputElement, ComboBoxProps>(
  ({ label, error, tooltip, isRequired, options, value, onChange, placeholder }, ref) => {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputId = label?.toLowerCase().replace(/\s+/g, "-");

    // Find display label for current value
    const displayValue = (() => {
      const match = options.find((opt) => optionValue(opt) === value);
      return match ? optionLabel(match) : value;
    })();

    const filtered = options.filter((opt) =>
      optionLabel(opt).toLowerCase().includes((filter || displayValue).toLowerCase())
    );

    useEffect(() => {
      const handleClick = (e: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
          setOpen(false);
          setFilter("");
        }
      };
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
      <div className="space-y-1" ref={wrapperRef}>
        {label && (
          <label htmlFor={inputId} className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {isRequired && <span className="ml-0.5 text-red-500">*</span>}
            {tooltip && <Tooltip text={tooltip} />}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type="text"
            value={filter !== "" ? filter : displayValue}
            placeholder={placeholder}
            onChange={(e) => {
              setFilter(e.target.value);
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className={`
              block w-full rounded-lg border px-3 py-2 text-sm
              transition-colors duration-150
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              focus:outline-none focus:ring-2 focus:ring-offset-0
              dark:bg-gray-800 dark:text-gray-100
              ${error
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
              }
            `}
          />
          {open && filtered.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {filtered.map((opt) => (
                <li
                  key={optionValue(opt)}
                  className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 ${
                    optionValue(opt) === value ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(optionValue(opt));
                    setFilter("");
                    setOpen(false);
                  }}
                >
                  {optionLabel(opt)}
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

ComboBox.displayName = "ComboBox";
export default ComboBox;
