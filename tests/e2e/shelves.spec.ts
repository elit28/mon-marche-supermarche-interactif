import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, firstSlot } from "./helpers";

test.describe("rayons", () => {
  test("affiche de vraies étagères avec de vrais produits, sans appel externe", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (req) => {
      const url = new URL(req.url());
      if (!["localhost", "127.0.0.1"].includes(url.hostname)) external.push(req.url());
    });
    await page.goto("/");
    await expect(page.getByText(/prix fictifs/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("rayon par rayon");
    const slots = page.locator("li[data-slot]");
    expect(await slots.count()).toBeGreaterThan(20);
    // Les photos sont servies localement et chargées.
    const img = firstSlot(page).locator("img[data-product-image]");
    await expect(img).toBeVisible();
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    // Prix au format français.
    await expect(firstSlot(page).locator(".price-tag")).toContainText(/€/);
    await expectNoHorizontalOverflow(page);
    expect(external, `Requêtes externes inattendues : ${external.join(", ")}`).toEqual([]);
  });

  test("le défilement d'une étagère ne fait pas bouger la page", async ({ page }) => {
    await page.goto("/");
    const scroller = page.locator("section .shelf-scroller").nth(1);
    await scroller.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    await scroller.evaluate((el) => el.scrollBy({ left: 600, behavior: "instant" as ScrollBehavior }));
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    const after = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    expect(after.x).toBe(0);
    expect(after.y).toBe(before.y);
  });

  test("charge les rayons suivants au défilement et permet d'aller à un rayon", async ({ page }) => {
    await page.goto("/");
    const lastShelf = page.locator('section[id^="rayon-"]').last();
    await lastShelf.scrollIntoViewIfNeeded();
    await expect(lastShelf.locator("li[data-slot]").first()).toBeVisible({ timeout: 15_000 });
    await page.goto("/rayon/boissons-eaux");
    await expect(page.getByRole("heading", { level: 1, name: "Boissons et eaux" })).toBeVisible();
    expect(await page.locator("li[data-slot]").count()).toBeGreaterThan(5);
    await expectNoHorizontalOverflow(page);
  });
});
