"use client";

import { useCallback } from "react";

interface Props {
  startDate: string | null;
  endDate: string | null;
}

/**
 * Opens the printable calendar view in a new tab with ?auto=1 so the print
 * dialog triggers automatically once the page loads.
 */
export function PrintButton({ startDate, endDate }: Props) {
  const handleClick = useCallback(() => {
    const params = new URLSearchParams();
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    params.set("auto", "1");
    window.open(`/calendar/print?${params.toString()}`, "_blank", "noopener");
  }, [startDate, endDate]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors min-h-[44px] text-zinc-700"
      aria-label="Imprimir ou exportar calendário como PDF"
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      Imprimir / PDF
    </button>
  );
}
