"use client";

/**
 * Panneau modal accessible basé sur l'élément natif <dialog> :
 * piège de focus, touche Échap, retour du focus et inertie du reste de la
 * page fournis par le navigateur. Les transitions n'utilisent que
 * `transform` et `opacity`.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Placement = "right" | "bottom" | "center" | "left" | "responsive-right" | "responsive-center";

const PANEL: Record<Placement, string> = {
  right: "ml-auto h-dvh max-h-dvh w-full max-w-[26rem] translate-x-full data-[open=true]:translate-x-0",
  left: "mr-auto h-dvh max-h-dvh w-full max-w-[24rem] -translate-x-full data-[open=true]:translate-x-0",
  bottom: "mt-auto max-h-[92dvh] w-full translate-y-full rounded-t-[1.75rem] data-[open=true]:translate-y-0",
  center: "m-auto max-h-[92dvh] w-[min(100%-2rem,60rem)] translate-y-6 scale-[0.97] rounded-[1.75rem] opacity-0 data-[open=true]:translate-y-0 data-[open=true]:scale-100 data-[open=true]:opacity-100",
  "responsive-right":
    "mt-auto max-h-[92dvh] w-full translate-y-full rounded-t-[1.75rem] data-[open=true]:translate-y-0 md:mt-0 md:ml-auto md:h-dvh md:max-h-dvh md:max-w-[27rem] md:translate-x-full md:translate-y-0 md:rounded-none md:data-[open=true]:translate-x-0",
  "responsive-center":
    "mt-auto max-h-[94dvh] w-full translate-y-full rounded-t-[1.75rem] data-[open=true]:translate-y-0 md:m-auto md:max-h-[90dvh] md:w-[min(100%-3rem,64rem)] md:translate-y-6 md:scale-[0.97] md:rounded-[1.75rem] md:opacity-0 md:data-[open=true]:translate-y-0 md:data-[open=true]:scale-100 md:data-[open=true]:opacity-100",
};

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Identifiant de l'élément qui sert de titre (aria-labelledby). */
  labelledBy: string;
  placement?: Placement;
  className?: string;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, labelledBy, placement = "responsive-right", className, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // `entered` passe à vrai une image après l'ouverture, pour déclencher la transition CSS.
  const [entered, setEntered] = useState(false);
  const visible = open && entered;
  const hasOpened = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      hasOpened.current = true;
      if (!dialog.open) dialog.showModal();
      document.documentElement.style.overflow = "hidden";
      const frame = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(frame);
    }
    if (!hasOpened.current) return;
    hasOpened.current = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => {
        setEntered(false);
        if (dialog.open) dialog.close();
        document.documentElement.style.overflow = "";
      },
      reduce ? 0 : 300,
    );
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(
    () => () => {
      if (hasOpened.current) document.documentElement.style.overflow = "";
    },
    [],
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "fixed inset-0 m-0 flex h-full max-h-none w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-transparent",
        "open:flex [&:not([open])]:hidden",
      )}
    >
      <div
        aria-hidden="true"
        data-open={visible}
        className="pointer-events-none fixed inset-0 bg-forest-950/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 data-[open=true]:opacity-100"
      />
      <div
        data-open={visible}
        className={cn(
          "relative z-10 flex flex-col overflow-hidden bg-cream-50 shadow-float transition-[transform,opacity] duration-300 ease-[var(--ease-out-soft)]",
          PANEL[placement],
          className,
        )}
      >
        {children}
      </div>
    </dialog>
  );
}
