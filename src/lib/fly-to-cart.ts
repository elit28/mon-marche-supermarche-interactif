/**
 * Animation « vers le panier » : une copie légère de l'emballage s'élève,
 * puis tombe en courbe dans le panier. Uniquement `transform`/`opacity`
 * (composition GPU), jamais bloquante : l'état du panier est mis à jour
 * AVANT l'animation. Désactivée si l'utilisateur préfère réduire les animations.
 */

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function findTarget(): HTMLElement | null {
  const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]"));
  return (
    targets.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
    }) ?? null
  );
}

const MAX_FLIGHTS = 6;
let flights = 0;

export function flyToCart(source: HTMLImageElement | null, onLand?: () => void): void {
  const target = findTarget();
  if (!source || !target || prefersReducedMotion() || flights >= MAX_FLIGHTS) {
    onLand?.();
    return;
  }
  const from = source.getBoundingClientRect();
  if (from.width === 0 || from.bottom < 0 || from.top > window.innerHeight) {
    onLand?.();
    return;
  }
  const to = target.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = Math.min(0.42, 46 / Math.max(from.width, from.height));

  // Deux calques : l'horizontal ralentit, le vertical accélère → trajectoire en arc.
  const outer = document.createElement("div");
  outer.setAttribute("aria-hidden", "true");
  Object.assign(outer.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    zIndex: "90",
    pointerEvents: "none",
    willChange: "transform",
  } satisfies Partial<CSSStyleDeclaration>);
  const inner = document.createElement("img");
  inner.src = source.currentSrc || source.src;
  inner.alt = "";
  Object.assign(inner.style, {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    willChange: "transform, opacity",
    filter: "drop-shadow(0 10px 12px rgba(15, 61, 34, 0.25))",
  } satisfies Partial<CSSStyleDeclaration>);
  outer.appendChild(inner);
  document.body.appendChild(outer);
  flights++;

  const duration = Math.min(900, Math.max(560, 420 + Math.hypot(dx, dy) * 0.35));
  outer.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dx}px)` }], {
    duration,
    easing: "cubic-bezier(0.25, 0.6, 0.35, 1)",
    fill: "forwards",
  });
  const fall = inner.animate(
    [
      { transform: "translateY(0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: "translateY(-34px) scale(1.07) rotate(-5deg)", opacity: 1, offset: 0.22, easing: "cubic-bezier(0.55, 0, 0.85, 0.35)" },
      { transform: `translateY(${dy}px) scale(${scale}) rotate(14deg)`, opacity: 0.95 },
    ],
    { duration, easing: "linear", fill: "forwards" },
  );
  const done = () => {
    outer.remove();
    flights = Math.max(0, flights - 1);
    onLand?.();
  };
  fall.addEventListener("finish", done, { once: true });
  fall.addEventListener("cancel", done, { once: true });
}
