"use client";

import { SelectHTMLAttributes, forwardRef } from "react";
import Tooltip from "./Tooltip";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  tooltip?: string;
  isRequired?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, tooltip, isRequired, options, placeholder, id, className = "", ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {isRequired && <span className="ml-0.5 text-red-500">*</span>}
            {tooltip && <Tooltip text={tooltip} />}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`
            block w-full rounded-lg border px-3 py-2 text-sm
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-offset-0
            dark:bg-gray-800 dark:text-gray-100
            ${error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
            }
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
