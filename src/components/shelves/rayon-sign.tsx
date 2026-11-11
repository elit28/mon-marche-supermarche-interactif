/**
 * Libellé de rayon discret, posé au-dessus de l'étagère (comme une réglette de
 * rayon) : nom en petites capitales et nombre de produits.
 */
import { cn } from "@/lib/cn";

export function RayonSign({
  id,
  title,
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
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      {icon ? (
        <span className="grid size-6 shrink-0 place-items-center rounded-md text-white [&_svg]:size-4" style={{ backgroundColor: accent }} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <Heading id={id} className="truncate text-[0.8rem] font-bold uppercase tracking-[0.12em] text-ink sm:text-[0.85rem]">
        {title}
        {countLabel ? <span className="ml-2 font-medium normal-case tracking-normal text-ink-muted">{countLabel}</span> : null}
      </Heading>
    </div>
  );
}
