export default function Loading() {
  return (
    <div className="mx-auto max-w-[110rem] space-y-10 px-4 py-8 sm:px-6 lg:px-10" aria-busy="true" aria-label="Chargement">
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <div className="skeleton h-8 w-64 rounded-lg" />
          <div className="mt-4 flex gap-5 overflow-hidden">
            {Array.from({ length: 8 }, (_, j) => (
              <div key={j} className="skeleton h-56 w-32 shrink-0 rounded-2xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
