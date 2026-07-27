"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-600">Dueable</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">Something interrupted the scaffold.</h1>
        <p className="mt-3 text-slate-600">Try reloading the page. If it happens again, inspect the workspace setup or environment variables next.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Retry
        </button>
      </div>
    </main>
  );
}