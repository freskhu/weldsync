"use client";

import { useEffect } from "react";

/**
 * Tiny client shim that triggers the browser's native print dialog after the
 * page has rendered. Only mounted when ?auto=1 is present.
 *
 * A small delay gives the browser time to layout fonts and colors before the
 * snapshot is taken; without it Chrome occasionally prints before the print
 * stylesheet resolves.
 */
export function AutoPrint() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.print();
      } catch {
        // ignore — user can still trigger Cmd+P manually
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
