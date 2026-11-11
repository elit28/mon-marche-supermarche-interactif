/**
 * Commandes de DÉMONSTRATION. Aucun paiement, aucune transmission.
 *
 * Règle de sécurité : le navigateur n'envoie que des identifiants et des
 * quantités. Les prix, promotions, frais et totaux sont TOUJOURS recalculés
 * ici à partir de la base. Cette couche est le point d'extension naturel pour
 * brancher plus tard stocks, TVA et prestataire de paiement.
 */
import "server-only";
import { randomInt } from "node:crypto";
import { computeCartTotals, computeFee, type Fulfillment } from "@/lib/pricing";
import type { ProductSummary } from "@/types/catalog";
import { getSql } from "../db";
import { getProductsByIds } from "./catalog";

export interface QuoteLine {
  product: ProductSummary;
  quantity: number;
  unitPriceCents: number;
  finalUnitPriceCents: number;
  lineTotalCents: number;
  discountCents: number;
}

export interface Quote {
  lines: QuoteLine[];
  unavailable: number[];
  itemCount: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export async function quoteCart(items: Array<{ productId: number; quantity: number }>): Promise<Quote> {
  const products = await getProductsByIds(items.map((i) => i.productId));
  const byId = new Map(products.map((p) => [p.id, p]));
  const available = items.filter((i) => byId.has(i.productId));
  const totals = computeCartTotals(
    available.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPriceCents: byId.get(i.productId)!.priceCents, promotion: byId.get(i.productId)!.promotion })),
  );
  return {
    lines: totals.lines.map((l) => ({
      product: byId.get(l.productId)!,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
      finalUnitPriceCents: l.finalUnitPriceCents,
      lineTotalCents: l.totalCents,
      discountCents: l.discountCents,
    })),
    unavailable: items.filter((i) => !byId.has(i.productId)).map((i) => i.productId),
    itemCount: totals.itemCount,
    subtotalCents: totals.subtotalCents,
    discountCents: totals.discountCents,
    totalCents: totals.totalCents,
  };
}

export interface Slot {
  id: string;
  label: string;
}

const SLOT_HOURS = [
  [9, 11],
  [11, 13],
  [14, 16],
  [18, 20],
] as const;

/** Créneaux fictifs : les trois prochains jours, heure de Paris. */
export function listSlots(now = new Date()): Slot[] {
  const slots: Slot[] = [];
  const fmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
  for (let d = 1; d <= 3; d++) {
    const day = new Date(now.getTime() + d * 86_400_000);
    const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(day);
    const dayLabel = fmt.format(day);
    for (const [from, to] of SLOT_HOURS) {
      slots.push({ id: `${iso}T${String(from).padStart(2, "0")}`, label: `${dayLabel.charAt(0).toUpperCase()}${dayLabel.slice(1)}, ${from} h – ${to} h` });
    }
  }
  return slots;
}

export interface OrderInput {
  items: Array<{ productId: number; quantity: number }>;
  fulfillment: Fulfillment;
  slotId: string;
  address: { name?: string; street?: string; postalCode?: string; city?: string } | null;
}

function makeReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "DEMO-";
  for (let i = 0; i < 6; i++) ref += alphabet[randomInt(alphabet.length)];
  return ref;
}

export type OrderResult =
  | { ok: true; reference: string; totalCents: number; feeCents: number; itemCount: number; slotLabel: string }
  | { ok: false; status: number; error: string };

export async function createDemoOrder(ownerKey: string, input: OrderInput): Promise<OrderResult> {
  const slot = listSlots().find((s) => s.id === input.slotId);
  if (!slot) return { ok: false, status: 422, error: "Ce créneau n'est plus disponible : choisissez-en un autre." };
  const quote = await quoteCart(input.items);
  if (quote.lines.length === 0) return { ok: false, status: 422, error: "Votre panier ne contient aucun produit disponible." };
  if (quote.unavailable.length > 0) return { ok: false, status: 409, error: "Certains produits ne sont plus disponibles. Vérifiez votre panier." };
  const feeCents = computeFee(quote.totalCents, input.fulfillment);
  const totalCents = quote.totalCents + feeCents;
  const address = input.address && Object.values(input.address).some(Boolean) ? input.address : null;
  const sql = getSql();

  for (let attempt = 0; attempt < 3; attempt++) {
    const reference = makeReference();
    try {
      await sql.begin(async (tx) => {
        const [order] = await tx<{ id: string }[]>`
          INSERT INTO demo_orders (reference, owner_key, fulfillment, slot_label, address, item_count, subtotal_cents, discount_cents, fee_cents, total_cents)
          VALUES (${reference}, ${ownerKey}, ${input.fulfillment}, ${slot.label}, ${address ? tx.json(address) : null}, ${quote.itemCount},
                  ${quote.subtotalCents}, ${quote.discountCents}, ${feeCents}, ${totalCents})
          RETURNING id
        `;
        const rows = quote.lines.map((l) => ({
          order_id: order!.id,
          product_id: l.product.id,
          name_snapshot: [l.product.name, l.product.brand, l.product.quantity].filter(Boolean).join(" · ").slice(0, 300),
          unit_price_cents: l.unitPriceCents,
          discount_cents: l.discountCents,
          quantity: l.quantity,
          line_total_cents: l.lineTotalCents,
        }));
        await tx`INSERT INTO demo_order_items ${tx(rows, "order_id", "product_id", "name_snapshot", "unit_price_cents", "discount_cents", "quantity", "line_total_cents")}`;
      });
      return { ok: true, reference, totalCents, feeCents, itemCount: quote.itemCount, slotLabel: slot.label };
    } catch (error) {
      if ((error as { code?: string }).code === "23505") continue; // collision de référence : on retente
      throw error;
    }
  }
  return { ok: false, status: 500, error: "La simulation a échoué, réessayez." };
}

export async function listDemoOrders(ownerKey: string) {
  return getSql()<{ reference: string; created_at: Date; total_cents: number; item_count: number; fulfillment: string; slot_label: string }[]>`
    SELECT reference, created_at, total_cents, item_count, fulfillment, slot_label
    FROM demo_orders WHERE owner_key = ${ownerKey} ORDER BY created_at DESC LIMIT 20
  `;
}

export async function getDemoOrder(ownerKey: string, reference: string) {
  if (!/^DEMO-[A-Z0-9]{6}$/.test(reference)) return null;
  const sql = getSql();
  const [order] = await sql<
    { id: string; reference: string; created_at: Date; fulfillment: string; slot_label: string; item_count: number; subtotal_cents: number; discount_cents: number; fee_cents: number; total_cents: number }[]
  >`SELECT id, reference, created_at, fulfillment, slot_label, item_count, subtotal_cents, discount_cents, fee_cents, total_cents FROM demo_orders WHERE reference = ${reference} AND owner_key = ${ownerKey}`;
  if (!order) return null;
  const items = await sql<{ name_snapshot: string; quantity: number; line_total_cents: number }[]>`
    SELECT name_snapshot, quantity, line_total_cents FROM demo_order_items WHERE order_id = ${order.id} ORDER BY name_snapshot
  `;
  return { ...order, items };
}

/** Efface toutes les données serveur d'un visiteur invité (droit à l'effacement). */
export async function deleteGuestData(ownerKey: string): Promise<void> {
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`DELETE FROM carts WHERE owner_key = ${ownerKey}`;
    await tx`DELETE FROM favorites WHERE owner_key = ${ownerKey}`;
    await tx`DELETE FROM shopping_lists WHERE owner_key = ${ownerKey}`;
    await tx`DELETE FROM demo_orders WHERE owner_key = ${ownerKey}`;
  });
}
