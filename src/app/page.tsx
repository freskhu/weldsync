import Link from "next/link";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">WeldSync</h1>
        <p className="text-lg text-zinc-600 mb-8">
          Sistema de planeamento de soldadura robotizada
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/projects", label: "Projetos" },
            { href: "/planning", label: "Planeamento" },
            { href: "/calendar", label: "Calendário" },
            { href: "/programs", label: "Programas" },
            { href: "/robots", label: "Robots" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-6 py-4 bg-white rounded-xl border border-zinc-200 text-zinc-700 font-medium hover:border-zinc-400 hover:shadow-sm transition-all min-h-[44px] flex items-center justify-center"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
