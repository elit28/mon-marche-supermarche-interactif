/** Message clair si la base est indisponible ou vide (installation incomplète). */
export function CatalogUnavailable({ empty = false }: { empty?: boolean }) {
  return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">{empty ? "Les rayons sont encore vides" : "Le magasin est momentanément fermé"}</h1>
      <p className="mt-4 text-ink-soft">
        {empty
          ? "Le catalogue n'a pas encore été importé. Lancez « pnpm db:setup » pour charger l'instantané des produits réels."
          : "La base de données ne répond pas. Vérifiez que PostgreSQL est démarré et que DATABASE_URL est correctement renseignée, puis rechargez la page."}
      </p>
    </section>
  );
}
