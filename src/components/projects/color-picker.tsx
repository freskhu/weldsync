"use client";

const PRESET_COLORS = [
  { hex: "#3B82F6", name: "Azul" },
  { hex: "#10B981", name: "Verde" },
  { hex: "#F59E0B", name: "Amarelo" },
  { hex: "#EF4444", name: "Vermelho" },
  { hex: "#8B5CF6", name: "Violeta" },
  { hex: "#EC4899", name: "Rosa" },
  { hex: "#06B6D4", name: "Ciano" },
  { hex: "#F97316", name: "Laranja" },
  { hex: "#6366F1", name: "Indigo" },
  { hex: "#84CC16", name: "Lima" },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  name?: string;
}

export function ColorPicker({ value, onChange, name = "color" }: ColorPickerProps) {
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            aria-label={c.name}
            onClick={() => onChange(c.hex)}
            className={`w-8 h-8 rounded-lg border-2 transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center ${
              value === c.hex
                ? "border-zinc-900 scale-110 ring-2 ring-[var(--color-brand-500)]/30 shadow-[var(--shadow-sm)]"
                : "border-transparent hover:border-zinc-300 hover:scale-105"
            }`}
            style={{ backgroundColor: c.hex }}
          >
            {value === c.hex && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
