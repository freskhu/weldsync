"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/projects", label: "Projetos", icon: "📁" },
  { href: "/planning", label: "Planeamento", icon: "📋" },
  { href: "/calendar", label: "Calendário", icon: "📅" },
  { href: "/programs", label: "Programas", icon: "💾" },
  { href: "/robots", label: "Robots", icon: "🤖" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close menu on resize to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) setOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Mobile/tablet top bar */}
      <div className="lg:hidden flex items-center justify-between bg-zinc-900 text-zinc-100 px-4 py-3 sticky top-0 z-40">
        <Link href="/" className="text-lg font-bold tracking-tight">
          WeldSync
        </Link>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 touch-manipulation"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile/tablet overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile/tablet slide-out menu */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-40 w-64 h-full bg-zinc-900 text-zinc-100 transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-zinc-800">
          <Link href="/" className="text-xl font-bold tracking-tight">
            WeldSync
          </Link>
          <p className="text-xs text-zinc-500 mt-1">Curval Metalworks</p>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                      isActive
                        ? "bg-zinc-700/50 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-zinc-900 text-zinc-100 min-h-screen flex-col flex-shrink-0">
        <div className="p-6 border-b border-zinc-800">
          <Link href="/" className="text-xl font-bold tracking-tight">
            WeldSync
          </Link>
          <p className="text-xs text-zinc-500 mt-1">Curval Metalworks</p>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                      isActive
                        ? "bg-zinc-700/50 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
