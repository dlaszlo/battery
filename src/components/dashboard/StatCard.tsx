"use client";

import { ReactNode } from "react";
import Link from "next/link";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: "blue" | "green" | "red" | "amber" | "purple";
  href?: string;
}

const colorStyles = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
  green: "bg-green-50 text-green-600 dark:bg-green-900/50 dark:text-green-400",
  red: "bg-red-50 text-red-600 dark:bg-red-900/50 dark:text-red-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400",
};

export default function StatCard({ label, value, icon, color, href }: StatCardProps) {
  const content = (
    <div className="flex items-center gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${colorStyles[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );

  const cls = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800";

  if (href) {
    return (
      <Link href={href} className={`${cls} hover:shadow-md transition-shadow block`}>
        {content}
      </Link>
    );
  }

  return <div className={cls}>{content}</div>;
}
