/**
 * Print-dedicated layout.
 *
 * Overrides the root app chrome (sidebar/nav) with a minimal white canvas
 * sized for A4 landscape. Uses a scoped CSS file with @page + @media print
 * rules so the native browser print dialog produces a clean PDF.
 */
import type { Metadata } from "next";
import "./print.css";

export const metadata: Metadata = {
  title: "Impressão · Calendário · WeldSync",
  robots: { index: false, follow: false },
};

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="print-root">{children}</div>;
}
