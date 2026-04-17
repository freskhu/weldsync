"use client";

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

  return (
    <aside className="w-64 bg-zinc-900 text-zinc-100 min-h-screen flex flex-col">
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
  );
}
