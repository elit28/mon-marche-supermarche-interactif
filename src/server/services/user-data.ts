/**
 * Données des visiteurs invités (panier, favoris), rattachées à une clé
 * anonyme. Les identifiants de produits reçus du navigateur sont toujours
 * revérifiés contre le catalogue actif.
 */
import "server-only";
import { getSql } from "../db";
import { getProductsByIds } from "./catalog";

async function activeIds(ids: readonly number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const rows = await getSql()<{ id: number }[]>`SELECT id FROM products WHERE is_active AND id = ANY(${[...ids]}::int[])`;
  return new Set(rows.map((r) => r.id));
}

export async function getCart(ownerKey: string) {
  const rows = await getSql()<{ product_id: number; quantity: number }[]>`
    SELECT ci.product_id, ci.quantity FROM carts c JOIN cart_items ci ON ci.cart_id = c.id
    WHERE c.owner_key = ${ownerKey} ORDER BY ci.added_at
  `;
  const products = await getProductsByIds(rows.map((r) => r.product_id));
  const byId = new Map(products.map((p) => [p.id, p]));
  return rows.filter((r) => byId.has(r.product_id)).map((r) => ({ product: byId.get(r.product_id)!, quantity: r.quantity }));
}

export async function saveCart(ownerKey: string, items: Array<{ productId: number; quantity: number }>) {
  const valid = await activeIds(items.map((i) => i.productId));
  const filtered = items.filter((i) => valid.has(i.productId));
  const sql = getSql();
  await sql.begin(async (tx) => {
    const [cart] = await tx<{ id: string }[]>`
      INSERT INTO carts (owner_key) VALUES (${ownerKey})
      ON CONFLICT (owner_key) DO UPDATE SET updated_at = now()
      RETURNING id
    `;
    await tx`DELETE FROM cart_items WHERE cart_id = ${cart!.id}`;
    if (filtered.length > 0) {
      const values = filtered.map((i, index) => ({
        cart_id: cart!.id,
        product_id: i.productId,
        quantity: i.quantity,
        added_at: new Date(Date.now() + index),
      }));
      await tx`INSERT INTO cart_items ${tx(values, "cart_id", "product_id", "quantity", "added_at")}`;
    }
  });
  return filtered.length;
}

export async function getFavoriteIds(ownerKey: string): Promise<Set<number>> {
  const rows = await getSql()<{ product_id: number }[]>`SELECT product_id FROM favorites WHERE owner_key = ${ownerKey}`;
  return new Set(rows.map((r) => r.product_id));
}

export async function getFavorites(ownerKey: string) {
  const rows = await getSql()<{ product_id: number }[]>`
    SELECT product_id FROM favorites WHERE owner_key = ${ownerKey} ORDER BY created_at DESC LIMIT 500
  `;
  return getProductsByIds(rows.map((r) => r.product_id));
}

export async function addFavorite(ownerKey: string, productId: number): Promise<boolean> {
  const valid = await activeIds([productId]);
  if (!valid.has(productId)) return false;
  await getSql()`INSERT INTO favorites (owner_key, product_id) VALUES (${ownerKey}, ${productId}) ON CONFLICT DO NOTHING`;
  return true;
}

export async function removeFavorite(ownerKey: string, productId: number): Promise<void> {
  await getSql()`DELETE FROM favorites WHERE owner_key = ${ownerKey} AND product_id = ${productId}`;
}

export async function replaceFavorites(ownerKey: string, productIds: number[]): Promise<number> {
  const valid = [...(await activeIds(productIds))];
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`DELETE FROM favorites WHERE owner_key = ${ownerKey}`;
    if (valid.length > 0) {
      await tx`INSERT INTO favorites ${tx(valid.map((id) => ({ owner_key: ownerKey, product_id: id })), "owner_key", "product_id")}`;
    }
  });
  return valid.length;
}
