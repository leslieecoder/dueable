export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-16 sm:px-10">
      <div className="h-48 animate-pulse rounded-[32px] bg-white/75" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-36 animate-pulse rounded-[28px] bg-white/70" />
        <div className="h-36 animate-pulse rounded-[28px] bg-white/70" />
      </div>
    </main>
  );
}