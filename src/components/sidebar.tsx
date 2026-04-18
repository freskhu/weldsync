"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* SVG icon components — colored, not emoji */
function IconDashboard({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "#94a3b8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}
function IconProjects({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={active ? "#a78bfa" : "#94a3b8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}
function IconPlanning({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={active ? "#f59e0b" : "#94a3b8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 3v18" />
    </svg>
  );
}
function IconCalendar({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={active ? "#22c55e" : "#94a3b8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconPrograms({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={active ? "#ec4899" : "#94a3b8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M10 13l2 2 4-4" />
    </svg>
  );
}
function IconRobots({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={active ? "#06b6d4" : "#94a3b8"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
      <circle cx="8.5" cy="15.5" r="1" fill={active ? "#06b6d4" : "#94a3b8"} />
      <circle cx="15.5" cy="15.5" r="1" fill={active ? "#06b6d4" : "#94a3b8"} />
      <path d="M9 19h6" />
    </svg>
  );
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard, activeColor: "rgba(96, 165, 250, 0.15)" },
  { href: "/projects", label: "Projetos", Icon: IconProjects, activeColor: "rgba(167, 139, 250, 0.15)" },
  { href: "/planning", label: "Planeamento", Icon: IconPlanning, activeColor: "rgba(245, 158, 11, 0.15)" },
  { href: "/calendar", label: "Calendario", Icon: IconCalendar, activeColor: "rgba(34, 197, 94, 0.15)" },
  { href: "/programs", label: "Programas", Icon: IconPrograms, activeColor: "rgba(236, 72, 153, 0.15)" },
  { href: "/robots", label: "Robots", Icon: IconRobots, activeColor: "rgba(6, 182, 212, 0.15)" },
];

function NavList({ pathname }: { pathname: string }) {
  return (
    <ul className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 min-h-[44px] ${
                isActive
                  ? "text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
              style={isActive ? { backgroundColor: item.activeColor } : undefined}
            >
              <item.Icon active={isActive} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function LogoMark() {
  return (
    <div className="flex items-center gap-3">
      {/* Logo icon */}
      <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <div>
        <span className="text-lg font-bold tracking-tight text-white block leading-tight">WeldSync</span>
        <span className="text-[11px] text-slate-500 tracking-wide">Curval Metalworks</span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
      <div className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40" style={{ backgroundColor: 'var(--color-surface-sidebar)' }}>
        <LogoMark />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[10px] text-slate-400 hover:text-white hover:bg-white/10 touch-manipulation"
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
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile/tablet slide-out menu */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-40 w-[280px] h-full transform transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: 'var(--color-surface-sidebar)' }}
      >
        <div className="p-5 border-b border-white/10">
          <LogoMark />
        </div>
        <nav className="p-4">
          <NavList pathname={pathname} />
        </nav>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-[260px] min-h-screen flex-col flex-shrink-0"
        style={{ backgroundColor: 'var(--color-surface-sidebar)' }}
      >
        <div className="p-5 border-b border-white/10">
          <LogoMark />
        </div>
        <nav className="flex-1 p-4">
          <NavList pathname={pathname} />
        </nav>
        {/* Bottom section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
              CM
            </div>
            <div>
              <span className="text-sm font-medium text-white block leading-tight">Curval</span>
              <span className="text-[10px] text-slate-500">Metalworks</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
