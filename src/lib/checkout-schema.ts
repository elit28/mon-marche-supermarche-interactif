/** Validation des données du parcours de commande (démonstration). */
import { z } from "zod";
import { MAX_QUANTITY_PER_ITEM } from "@/lib/pricing";

export const cartItemsSchema = z
  .array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM) }))
  .min(1, "Votre panier est vide.")
  .max(300);

const optionalText = (max: number) =>
  z
    .string()
    .max(max, `${max} caractères maximum.`)
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim())
    .optional();

export const addressSchema = z
  .object({
    name: optionalText(80),
    street: optionalText(120),
    postalCode: z
      .string()
      .trim()
      .regex(/^(\d{5})?$/, "Le code postal doit comporter 5 chiffres.")
      .optional(),
    city: optionalText(80),
  })
  .nullable();

export const orderSchema = z.object({
  items: cartItemsSchema,
  fulfillment: z.enum(["delivery", "pickup"]),
  slotId: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}$/, "Choisissez un créneau."),
  address: addressSchema,
  acknowledged: z.literal(true, { error: "Confirmez avoir compris qu'il s'agit d'une simulation." }),
});

export type OrderPayload = z.input<typeof orderSchema>;
