import Link from "next/link";

export default function ExtensionPage() {
  return (
    <main className="space-y-8">
      <header className="max-w-3xl">
        <p className="dueable-eyebrow text-[#9aa7bd]">Extension</p>
        <h1 className="dueable-display mt-4 text-[3.2rem] leading-[0.96] tracking-tighter text-[#0f172a] sm:text-[4.1rem]">Dueable lives next to Canvas.</h1>
        <p className="mt-5 text-[1.05rem] leading-8 text-[#7b88a2]">Use the Chrome extension to see what assignment matters most, finish the next step, and stay in flow without leaving Canvas.</p>
      </header>

      <section className="dueable-surface max-w-3xl rounded-4xl p-8 sm:p-10">
        <p className="dueable-eyebrow text-[#5a8b7d]">What it does</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-3xl bg-[#fbfcff] p-5">
            <h2 className="text-[1.2rem] font-semibold tracking-[-0.03em] text-[#15295c]">See the next assignment</h2>
            <p className="mt-3 text-base leading-7 text-[#6f7f99]">Dueable picks the assignment that deserves your attention first.</p>
          </article>
          <article className="rounded-3xl bg-[#fbfcff] p-5">
            <h2 className="text-[1.2rem] font-semibold tracking-[-0.03em] text-[#15295c]">Finish the next step</h2>
            <p className="mt-3 text-base leading-7 text-[#6f7f99]">Check off one real task at a time and keep your progress synced.</p>
          </article>
          <article className="rounded-3xl bg-[#fbfcff] p-5">
            <h2 className="text-[1.2rem] font-semibold tracking-[-0.03em] text-[#15295c]">Return to the dashboard anytime</h2>
            <p className="mt-3 text-base leading-7 text-[#6f7f99]">Use the full web app when you want the bigger roadmap or your weekly plan.</p>
          </article>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href="chrome://extensions" className="dueable-button-primary inline-flex min-h-14 items-center justify-center px-7 py-4 text-[1.05rem] font-semibold">
            Open Chrome Extensions
          </a>
          <Link href="/dashboard" className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-7 py-4 text-[1.05rem] font-semibold text-[#2d6cdf] shadow-[0_16px_30px_-24px_rgba(15,23,42,0.35)]">
            Back to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
