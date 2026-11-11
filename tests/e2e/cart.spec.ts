import { expect, test } from "@playwright/test";
import { firstSlot, openCart, resetClientState } from "./helpers";

test.describe("panier", () => {
  test.beforeEach(async ({ page }) => resetClientState(page));

  test("ajoute, ajuste, supprime et conserve après actualisation", async ({ page }) => {
    await page.goto("/");
    const slot = firstSlot(page, "promotions");
    await slot.getByRole("button", { name: /^Ajouter .* au panier/ }).click();
    // Le bouton devient un compteur immédiatement.
    const group = slot.getByRole("group", { name: /Quantité de/ });
    await expect(group).toContainText("1");
    await expect(page.getByRole("button", { name: /^Ouvrir le panier :.* 1 article$/ }).first()).toBeVisible();

    await group.getByRole("button", { name: /^Ajouter un/ }).click();
    await expect(group).toContainText("2");
    await expect(page.getByRole("button", { name: /^Ouvrir le panier :.* 2 articles$/ }).first()).toBeVisible();

    // Persistance.
    await page.reload();
    await expect(page.getByRole("button", { name: /^Ouvrir le panier :.* 2 articles$/ }).first()).toBeVisible();

    await openCart(page);
    const lines = page.getByRole("list", { name: "Articles du panier" }).getByRole("listitem");
    await expect(lines).toHaveCount(1);
    await lines.first().getByRole("button", { name: /^Retirer un/ }).click();
    await expect(lines.first()).toContainText("1");
    await lines.first().getByRole("button", { name: /du panier$/ }).click();
    await expect(page.getByRole("dialog").getByText("Votre panier est vide")).toBeVisible();
  });

  test("vide le panier après confirmation", async ({ page }) => {
    await page.goto("/");
    const slots = page.locator("#promotions li[data-slot]");
    for (let i = 0; i < 3; i++) await slots.nth(i).getByRole("button", { name: /^Ajouter .* au panier/ }).click();
    await openCart(page);
    await page.getByRole("button", { name: "Vider le panier" }).click();
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page.getByRole("list", { name: "Articles du panier" }).getByRole("listitem")).toHaveCount(3);
    await page.getByRole("button", { name: "Vider le panier" }).click();
    await page.getByRole("button", { name: "Vider", exact: true }).click();
    await expect(page.getByRole("dialog").getByText("Votre panier est vide")).toBeVisible();
  });

  test("annonce les ajouts aux technologies d'assistance", async ({ page }) => {
    await page.goto("/");
    await firstSlot(page, "promotions").getByRole("button", { name: /^Ajouter .* au panier/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "ajouté au panier" })).toHaveText(/ajouté au panier.*total/);
  });

  test("fonctionne sans animation (préférence de mouvement réduit)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await firstSlot(page, "promotions").getByRole("button", { name: /^Ajouter .* au panier/ }).click();
    await expect(page.getByRole("button", { name: /^Ouvrir le panier :.* 1 article$/ }).first()).toBeVisible();
    // Aucune copie volante de l'emballage n'est créée.
    expect(await page.locator("body > div[aria-hidden=true] > img").count()).toBe(0);
  });
});
