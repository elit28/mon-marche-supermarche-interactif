import { expect, test } from "@playwright/test";
import { firstSlot, resetClientState } from "./helpers";

test.describe("parcours complets", () => {
  test.beforeEach(async ({ page }) => resetClientState(page));

  test("commande simulée de bout en bout, montants calculés par le serveur", async ({ page }) => {
    await page.goto("/");
    const slots = page.locator("#promotions li[data-slot]");
    await slots.nth(0).getByRole("button", { name: /^Ajouter .* au panier/ }).click();
    await slots.nth(1).getByRole("button", { name: /^Ajouter .* au panier/ }).click();
    await page.goto("/commande");
    await expect(page.getByRole("heading", { name: "Récapitulatif du panier" })).toBeVisible();
    await expect(page.getByText("Calculé par le serveur")).toBeVisible();
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page.getByRole("heading", { name: "Vérifiez les quantités" })).toBeVisible();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByLabel("Code postal").fill("123");
    await expect(page.getByText(/doit comporter 5 chiffres/)).toBeVisible();
    await page.getByLabel("Code postal").fill("");
    await page.getByRole("button", { name: "Passer cette étape" }).click();
    await page.getByLabel("Retrait au magasin").check();
    await page.getByRole("button", { name: "Continuer" }).click();
    const submit = page.getByRole("button", { name: "Simuler la commande" });
    await expect(submit).toBeDisabled();
    await page.getByRole("checkbox", { name: /simulation/ }).check();
    await submit.click();
    await expect(page.getByRole("heading", { name: "Commande simulée !" })).toBeVisible();
    await expect(page.locator("strong.font-mono")).toHaveText(/^DEMO-[A-Z0-9]{6}$/);
    await expect(page.getByText(/aucun paiement/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Ouvrir le panier :.* 0 article$/ }).first()).toBeVisible();
  });

  test("favoris, liste de courses partagée et conversion en panier", async ({ page, context }) => {
    await page.goto("/");
    const slot = firstSlot(page, "promotions");
    await slot.getByRole("link", { name: /^Voir la fiche/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /aux favoris$/ }).first().click();
    await dialog.getByRole("button", { name: "Ajouter à une liste" }).click();
    await dialog.getByLabel("Nom de la nouvelle liste").fill("Courses du test");
    await dialog.getByRole("button", { name: /Créer la liste/ }).click();
    await expect(dialog.getByRole("status").filter({ hasText: "Courses du test" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/favoris");
    await expect(page.locator("li[data-slot]")).toHaveCount(1);

    await page.goto("/listes");
    await page.getByRole("link", { name: /Courses du test/ }).click();
    await page.getByLabel("Ajouter un article").fill("Pain de campagne");
    await page.getByRole("button", { name: /Ajouter l.article/ }).click();
    await expect(page.getByText("Pain de campagne")).toBeVisible();
    await page.getByRole("button", { name: "Créer un lien de partage" }).click();
    const shareUrl = await page.getByLabel("Lien de partage").inputValue();
    expect(shareUrl).toMatch(/\/liste\/[A-Za-z0-9_-]{20,}$/);

    // Un autre visiteur ouvre le lien : lecture seule, sans données personnelles.
    const other = await context.browser()!.newContext();
    const otherPage = await other.newPage();
    await otherPage.goto(shareUrl);
    await expect(otherPage.getByRole("heading", { name: "Courses du test" })).toBeVisible();
    await expect(otherPage.getByText("Pain de campagne")).toBeVisible();
    await other.close();

    await page.getByRole("button", { name: /Tout mettre au panier/ }).click();
    await expect(page.getByRole("heading", { name: "Votre panier" })).toBeVisible();
  });

  test("protège l'administration", async ({ page }) => {
    await page.goto("/admin/produits");
    await expect(page).toHaveURL(/\/admin\/connexion/);
    await page.getByLabel("Adresse e-mail").fill("intrus@example.com");
    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Identifiants invalides.")).toBeVisible();
  });
});
