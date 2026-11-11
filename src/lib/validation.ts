/** Schémas de validation partagés (Zod). */
import { z } from "zod";

/** Retire les caractères de contrôle et compacte les espaces. */
export const cleanText = (max: number, emptyMessage = "Ce champ est obligatoire.") =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1, emptyMessage).max(max, `${max} caractères maximum.`));

export const listNameSchema = cleanText(80, "Donnez un nom à la liste.");
export const listLabelSchema = cleanText(120, "Indiquez un article.");
