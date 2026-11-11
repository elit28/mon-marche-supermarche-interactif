import { expect, type Page } from "@playwright/test";

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

/** Premier emplacement produit visible d'une étagère. */
export function firstSlot(page: Page, shelfId?: string) {
  const scope = shelfId ? page.locator(`#${shelfId}`) : page.locator("main");
  return scope.locator("li[data-slot]").first();
}

/** Ouvre le panier (pastille d'en-tête). */
export async function openCart(page: Page) {
  await page.getByRole("button", { name: /^Ouvrir le panier/ }).first().click();
  await expect(page.getByRole("heading", { name: "Votre panier" })).toBeVisible();
}

/** Vérifie l'absence de défilement horizontal involontaire de la page. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

export async function resetClientState(page: Page) {
  await page.goto("/a-propos");
  await page.evaluate(() => localStorage.clear());
}
