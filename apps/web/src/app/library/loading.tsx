export default function LibraryLoading() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-border-subtle bg-bg-base/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="h-5 w-24 animate-pulse rounded bg-bg-muted" />
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 h-10 w-48 animate-pulse rounded bg-bg-muted" />
        <div className="mb-6 h-9 w-full max-w-md animate-pulse rounded bg-bg-muted" />
        <div className="mb-8 flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-md bg-bg-surface shadow-sm">
              <div className="aspect-[4/5] animate-pulse bg-bg-muted" />
              <div className="space-y-2 p-3">
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
