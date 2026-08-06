"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ExtensionAuthCompletePage() {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.close();
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-16 sm:px-10">
      <div className="w-full max-w-md rounded-4xl border border-white/70 bg-white/90 p-8 text-center shadow-[0_24px_70px_-34px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-10">
        <p className="dueable-eyebrow text-sky-700">Dueable</p>
        <h1 className="dueable-display mt-4 text-[2.8rem] leading-[0.96] tracking-tighter text-slate-950">You&apos;re connected.</h1>
        <p className="mt-4 text-base leading-8 text-slate-600">Returning you to Canvas now so your extension can finish loading.</p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/dashboard" className="dueable-button-primary inline-flex min-h-14 w-full items-center justify-center px-5 py-4 text-[1.05rem] font-semibold transition">
            Open Dueable dashboard
          </Link>
          <p className="text-sm text-slate-500">If this tab does not close automatically, you can close it and go back to Canvas.</p>
        </div>
      </div>
    </main>
  );
}
