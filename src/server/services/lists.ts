/**
 * Listes de courses des visiteurs invités. Le partage passe par un jeton
 * aléatoire non devinable ; la vue partagée n'expose ni la clé du
 * propriétaire ni aucune donnée personnelle.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { ProductSummary } from "@/types/catalog";
import { getSql } from "../db";
import { getProductsByIds } from "./catalog";

export interface ListItem {
  id: number;
  label: string | null;
  quantity: number;
  checked: boolean;
  product: ProductSummary | null;
}

export interface ShoppingList {
  id: string;
  name: string;
  shareToken: string | null;
  itemCount: number;
  updatedAt: string;
  items?: ListItem[];
}

export const MAX_LISTS = 30;
export const MAX_ITEMS_PER_LIST = 200;

export async function getLists(ownerKey: string): Promise<ShoppingList[]> {
  const rows = await getSql()<{ id: string; name: string; share_token: string | null; updated_at: Date; count: number }[]>`
    SELECT l.id, l.name, l.share_token, l.updated_at, count(i.id)::int AS count
    FROM shopping_lists l LEFT JOIN shopping_list_items i ON i.list_id = l.id
    WHERE l.owner_key = ${ownerKey}
    GROUP BY l.id ORDER BY l.updated_at DESC
  `;
  return rows.map((r) => ({ id: r.id, name: r.name, shareToken: r.share_token, itemCount: r.count, updatedAt: r.updated_at.toISOString() }));
}

async function hydrateItems(listId: string): Promise<ListItem[]> {
  const rows = await getSql()<{ id: number; product_id: number | null; label: string | null; quantity: number; checked: boolean }[]>`
    SELECT id, product_id, label, quantity, checked FROM shopping_list_items WHERE list_id = ${listId} ORDER BY position, id
  `;
  const products = await getProductsByIds(rows.map((r) => r.product_id).filter((id): id is number => id !== null));
  const byId = new Map(products.map((p) => [p.id, p]));
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    quantity: r.quantity,
    checked: r.checked,
    product: r.product_id ? (byId.get(r.product_id) ?? null) : null,
  }));
}

export async function getList(ownerKey: string, listId: string): Promise<ShoppingList | null> {
  if (!/^[0-9a-f-]{36}$/.test(listId)) return null;
  const rows = await getSql()<{ id: string; name: string; share_token: string | null; updated_at: Date }[]>`
    SELECT id, name, share_token, updated_at FROM shopping_lists WHERE id = ${listId} AND owner_key = ${ownerKey}
  `;
  const list = rows[0];
  if (!list) return null;
  const items = await hydrateItems(list.id);
  return { id: list.id, name: list.name, shareToken: list.share_token, updatedAt: list.updated_at.toISOString(), itemCount: items.length, items };
}

export async function getSharedList(token: string): Promise<{ name: string; items: ListItem[] } | null> {
  if (!/^[A-Za-z0-9_-]{20,32}$/.test(token)) return null;
  const rows = await getSql()<{ id: string; name: string }[]>`SELECT id, name FROM shopping_lists WHERE share_token = ${token}`;
  const list = rows[0];
  if (!list) return null;
  return { name: list.name, items: await hydrateItems(list.id) };
}

export async function createList(ownerKey: string, name: string): Promise<ShoppingList | { error: string }> {
  const sql = getSql();
  const count = (await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM shopping_lists WHERE owner_key = ${ownerKey}`)[0]?.count ?? 0;
  if (count >= MAX_LISTS) return { error: `Vous avez atteint la limite de ${MAX_LISTS} listes.` };
  const [row] = await sql<{ id: string; updated_at: Date }[]>`
    INSERT INTO shopping_lists (owner_key, name) VALUES (${ownerKey}, ${name}) RETURNING id, updated_at
  `;
  return { id: row!.id, name, shareToken: null, itemCount: 0, updatedAt: row!.updated_at.toISOString(), items: [] };
}

async function ownsList(ownerKey: string, listId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(listId)) return false;
  const rows = await getSql()`SELECT 1 FROM shopping_lists WHERE id = ${listId} AND owner_key = ${ownerKey}`;
  return rows.length > 0;
}

async function touch(listId: string) {
  await getSql()`UPDATE shopping_lists SET updated_at = now() WHERE id = ${listId}`;
}

export async function renameList(ownerKey: string, listId: string, name: string): Promise<boolean> {
  const rows = await getSql()`UPDATE shopping_lists SET name = ${name}, updated_at = now() WHERE id = ${listId} AND owner_key = ${ownerKey} RETURNING id`;
  return rows.length > 0;
}

export async function deleteList(ownerKey: string, listId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(listId)) return false;
  const rows = await getSql()`DELETE FROM shopping_lists WHERE id = ${listId} AND owner_key = ${ownerKey} RETURNING id`;
  return rows.length > 0;
}

export async function addListItem(
  ownerKey: string,
  listId: string,
  item: { productId?: number; label?: string; quantity: number },
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!(await ownsList(ownerKey, listId))) return { ok: false, status: 404, error: "Liste introuvable." };
  const sql = getSql();
  const count = (await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM shopping_list_items WHERE list_id = ${listId}`)[0]?.count ?? 0;
  if (count >= MAX_ITEMS_PER_LIST) return { ok: false, status: 409, error: "Cette liste est pleine." };
  if (item.productId) {
    const exists = await sql`SELECT 1 FROM products WHERE id = ${item.productId} AND is_active`;
    if (exists.length === 0) return { ok: false, status: 404, error: "Produit introuvable." };
    const updated = await sql`
      UPDATE shopping_list_items SET quantity = LEAST(99, quantity + ${item.quantity}), checked = false
      WHERE list_id = ${listId} AND product_id = ${item.productId} RETURNING id
    `;
    if (updated.length === 0) {
      await sql`INSERT INTO shopping_list_items (list_id, product_id, quantity, position) VALUES (${listId}, ${item.productId}, ${item.quantity}, ${count})`;
    }
  } else if (item.label) {
    await sql`INSERT INTO shopping_list_items (list_id, label, quantity, position) VALUES (${listId}, ${item.label}, ${item.quantity}, ${count})`;
  }
  await touch(listId);
  return { ok: true };
}

export async function updateListItem(ownerKey: string, listId: string, itemId: number, patch: { quantity?: number; checked?: boolean }): Promise<boolean> {
  if (!(await ownsList(ownerKey, listId))) return false;
  const sql = getSql();
  const rows = await sql`
    UPDATE shopping_list_items SET
      quantity = COALESCE(${patch.quantity ?? null}::int, quantity),
      checked = COALESCE(${patch.checked ?? null}::boolean, checked)
    WHERE id = ${itemId} AND list_id = ${listId} RETURNING id
  `;
  if (rows.length > 0) await touch(listId);
  return rows.length > 0;
}

export async function deleteListItem(ownerKey: string, listId: string, itemId: number): Promise<boolean> {
  if (!(await ownsList(ownerKey, listId))) return false;
  const rows = await getSql()`DELETE FROM shopping_list_items WHERE id = ${itemId} AND list_id = ${listId} RETURNING id`;
  if (rows.length > 0) await touch(listId);
  return rows.length > 0;
}

export async function setSharing(ownerKey: string, listId: string, enabled: boolean): Promise<string | null | false> {
  if (!(await ownsList(ownerKey, listId))) return false;
  const token = enabled ? randomBytes(18).toString("base64url") : null;
  await getSql()`UPDATE shopping_lists SET share_token = ${token}, updated_at = now() WHERE id = ${listId}`;
  return token;
}

/** Copie une liste partagée dans les listes du visiteur (produits et libellés). */
export async function importSharedList(ownerKey: string, token: string): Promise<string | null> {
  const shared = await getSharedList(token);
  if (!shared) return null;
  const created = await createList(ownerKey, shared.name.slice(0, 80));
  if ("error" in created) return null;
  for (const item of shared.items.slice(0, MAX_ITEMS_PER_LIST)) {
    if (item.product) await addListItem(ownerKey, created.id, { productId: item.product.id, quantity: item.quantity });
    else if (item.label) await addListItem(ownerKey, created.id, { label: item.label, quantity: item.quantity });
  }
  return created.id;
}
