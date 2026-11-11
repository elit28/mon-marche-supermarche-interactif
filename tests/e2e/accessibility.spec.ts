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
  test("accueil, recherche, rayon et fiche", async ({ page }) => {
    for (const url of ["/", "/recherche?q=chocolat", "/rayon/fromages", "/a-propos"]) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      expect(serious(await scan(page)), url).toEqual([]);
    }
    const href = await firstSlot(page.context().pages()[0]!).getByRole("link").first().getAttribute("href").catch(() => null);
    if (href) {
      await page.goto(href);
      expect(serious(await scan(page)), href).toEqual([]);
    }
  });

  test("panier ouvert et navigation au clavier", async ({ page }) => {
    await page.goto("/");
    await firstSlot(page, "promotions").getByRole("button", { name: /^Ajouter .* au panier/ }).click();
    await openCart(page);
    expect(serious(await scan(page))).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Votre panier" })).toBeHidden();
    // Le lien d'évitement est le premier élément focalisable.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
  });
});
