"use client";

import { useState, useRef, useEffect, forwardRef } from "react";
import Tooltip from "./Tooltip";

interface ComboBoxProps {
  label?: string;
  error?: string;
  tooltip?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const ComboBox = forwardRef<HTMLInputElement, ComboBoxProps>(
  ({ label, error, tooltip, options, value, onChange, placeholder }, ref) => {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputId = label?.toLowerCase().replace(/\s+/g, "-");

    const filtered = options.filter((opt) =>
      opt.toLowerCase().includes((filter || value).toLowerCase())
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
            {tooltip && <Tooltip text={tooltip} />}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type="text"
            value={filter !== "" ? filter : value}
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
                  key={opt}
                  className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 ${
                    opt === value ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt);
                    setFilter("");
                    setOpen(false);
                  }}
                >
                  {opt}
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
