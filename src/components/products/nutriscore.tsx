import { cn } from "@/lib/cn";
import type { NutriscoreGrade } from "@/types/catalog";

const COLORS: Record<NutriscoreGrade, string> = {
  a: "bg-nutri-a text-white",
  b: "bg-nutri-b text-white",
  c: "bg-nutri-c text-ink",
  d: "bg-nutri-d text-white",
  e: "bg-nutri-e text-white",
};

/** Indicateur Nutri-Score (lettre mise en avant) — donnée issue d'Open Food Facts. */
export function NutriScore({ grade, size = "md" }: { grade: NutriscoreGrade; size?: "sm" | "md" }) {
  return (
    <span className="inline-flex flex-col gap-1" role="img" aria-label={`Nutri-Score ${grade.toUpperCase()}`}>
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-muted" aria-hidden="true">
        Nutri-Score
      </span>
      <span className="inline-flex items-center rounded-lg bg-white p-0.5 shadow-sm ring-1 ring-forest-900/10" aria-hidden="true">
        {(["a", "b", "c", "d", "e"] as const).map((g) => (
          <span
            key={g}
            className={cn(
              "grid place-items-center font-bold uppercase transition",
              COLORS[g],
              g === grade
                ? cn("z-10 rounded-md shadow-md ring-2 ring-white", size === "sm" ? "h-7 w-6 text-sm" : "h-9 w-8 text-lg")
                : cn("opacity-35 first:rounded-l-md last:rounded-r-md", size === "sm" ? "h-5 w-4 text-[0.6rem]" : "h-7 w-6 text-xs"),
            )}
          >
            {g}
          </span>
        ))}
      </span>
    </span>
  );
}
