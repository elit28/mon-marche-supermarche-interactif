import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { firstSlot, openCart } from "./helpers";

const scan = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

function serious(results: Awaited<ReturnType<typeof scan>>) {
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}) : ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

test.describe("accessibilité (axe-core, WCAG 2.2 AA)", () => {
  test("accueil, recherche, rayon, fiche et commande", async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/");
    const href = await firstSlot(page).getByRole("link").first().getAttribute("href");
    for (const url of ["/", "/recherche?q=chocolat", "/rayon/fromages", "/a-propos", "/commande", href!]) {
      await page.goto(url);
      await page.waitForLoadState("load");
      await page.waitForTimeout(600);
      expect(serious(await scan(page)), url).toEqual([]);
    }
  });

  test("panier ouvert et navigation au clavier", async ({ page }) => {
    await page.goto("/");
    await firstSlot(page, "promotions").getByRole("button", { name: /^Ajouter .* au panier/ }).click();
    await openCart(page);
    expect(serious(await scan(page))).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Votre panier" })).toBeHidden();
    // Sur une page fraîche, le lien d'évitement est le premier élément focalisable.
    await page.goto("/a-propos");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
  });
});
