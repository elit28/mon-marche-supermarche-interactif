import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, firstSlot } from "./helpers";

test.describe("recherche et fiches", () => {
  test("filtre les rayons pendant la frappe, tolère les fautes et les accents", async ({ page }) => {
    await page.goto("/");
    const input = page.getByRole("combobox", { name: /Rechercher/ });
    await input.fill("nutela");
    await expect(page).toHaveURL(/\/recherche\?q=nutela/);
    await expect(page.locator("li[data-slot]").filter({ hasText: /Nutella/i }).first()).toBeVisible();
    await input.fill("pates");
    await expect(page).toHaveURL(/q=pates/);
    await expect(page.getByRole("heading", { name: /Pâtes, riz et féculents/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("trie et filtre via l'URL (prix croissant, bio, promotions)", async ({ page }) => {
    await page.goto("/recherche?tri=prix-asc&categorie=boissons-eaux");
    const prices = await page.locator("li[data-slot] .price-tag span[aria-label]").evaluateAll((els) =>
      els.slice(0, 8).map((el) => Number.parseFloat((el.getAttribute("aria-label") ?? "0").replace(/[^\d,]/g, "").replace(",", "."))),
    );
    expect(prices.length).toBeGreaterThan(2);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    await page.goto("/recherche?bio=1");
    await expect(page.getByRole("button", { name: "Bio" })).toHaveAttribute("aria-pressed", "true");
    await page.goto("/recherche?promo=1");
    expect(await page.locator("li[data-slot]").count()).toBeGreaterThan(0);
    await expect(page.locator("li[data-slot]").first()).toContainText(/%|€/);
  });

  test("ouvre une fiche en fenêtre par-dessus les rayons puis la referme", async ({ page }) => {
    await page.goto("/");
    const slot = firstSlot(page, "promotions");
    await slot.getByRole("link", { name: /^Voir la fiche/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Informations et provenance")).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Fiche Open .* Facts/ })).toHaveAttribute("href", /openfoodfacts|openbeautyfacts|openproductsfacts|openpetfoodfacts/);
    await expect(dialog.getByText(/Prix fictif de démonstration/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/$/);
    await expect(dialog).toBeHidden();
  });

  test("affiche une fiche complète en accès direct", async ({ page }) => {
    await page.goto("/");
    const href = await firstSlot(page).getByRole("link", { name: /^Voir la fiche/ }).getAttribute("href");
    await page.goto(href!);
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    await expect(page.getByText(/Code-barres/)).toBeVisible();
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByRole("group", { name: /Quantité de/ }).first()).toContainText("1");
  });
});
