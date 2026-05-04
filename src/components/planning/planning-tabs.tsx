"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Top-level tab strip for /planning.
 *
 * Keeps tab state in the URL (`?view=kanban|manual`) so:
 *  - reloads land on the same view
 *  - links/bookmarks work
 *  - the active tab is server-readable (we render the right Server
 *    Component subtree in the page) — no client-only state to hydrate
 *
 * Tabs are <Link>s, not buttons, so they're keyboard- and screen-reader
 * navigable for free, and the URL change is a real navigation. Touch
 * targets are 44px tall (iPad / shop floor).
 */

const TABS = [
  { id: "kanban", label: "Kanban" },
  { id: "manual", label: "Soldado à mão" },
] as const;

export type PlanningView = (typeof TABS)[number]["id"];

interface Props {
  /** Active tab — resolved on the server from searchParams. */
  active: PlanningView;
  /** Optional badge per tab (e.g. count). Renders right of the label. */
  badges?: Partial<Record<PlanningView, ReactNode>>;
}

export function PlanningTabs({ active, badges }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();

  function hrefFor(view: PlanningView): string {
    const next = new URLSearchParams(params.toString());
    if (view === "kanban") {
      // Default — keep URL clean.
      next.delete("view");
    } else {
      next.set("view", view);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div
      role="tablist"
      aria-label="Vista de programação"
      className="flex border-b border-zinc-200 mb-4 -mx-1 px-1 overflow-x-auto"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            role="tab"
            aria-selected={isActive}
            // scroll=false: tabs sit at the top of the page already, no need
            // to jump scroll position when the user toggles between views.
            scroll={false}
            className={[
              "inline-flex items-center gap-2 min-h-[44px] px-4 text-[14px] font-semibold border-b-2 transition-colors touch-manipulation",
              isActive
                ? "border-[var(--color-brand-600,#2563eb)] text-[var(--color-brand-700,#1d4ed8)]"
                : "border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300",
            ].join(" ")}
          >
            <span>{tab.label}</span>
            {badges?.[tab.id] != null && (
              <span
                className={[
                  "inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold",
                  isActive
                    ? "bg-[var(--color-brand-100,#dbeafe)] text-[var(--color-brand-700,#1d4ed8)]"
                    : "bg-zinc-100 text-zinc-600",
                ].join(" ")}
              >
                {badges[tab.id]}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
