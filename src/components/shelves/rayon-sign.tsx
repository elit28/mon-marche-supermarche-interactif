/** Panneau de rayon : sur-titre, nom en typographie d'enseigne, comptage. */
import { cn } from "@/lib/cn";

export function RayonSign({
  id,
  title,
  eyebrow,
  accent = "#166534",
  icon,
  countLabel,
  as: Heading = "h2",
  className,
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  accent?: string;
  icon?: React.ReactNode;
  countLabel?: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {icon ? (
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm sm:size-11"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        {eyebrow ? (
          <p className="truncate text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: accent }}>
            {eyebrow}
          </p>
        ) : null}
        <Heading id={id} className="truncate font-display text-[1.25rem] font-semibold leading-tight text-ink sm:text-[1.6rem]">
          {title}
          {countLabel ? <span className="ml-2 align-middle font-sans text-sm font-medium text-ink-muted">{countLabel}</span> : null}
        </Heading>
      </div>
    </div>
  );
}
