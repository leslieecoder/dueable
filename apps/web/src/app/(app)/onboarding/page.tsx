import { redirect } from "next/navigation";
import { completeOnboardingImportCheck } from "@/features/onboarding/actions";
import { hasImportedAssignments, requireUser } from "@/lib/auth/session";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string }>;
}) {
  const user = await requireUser();
  const importedAssignments = await hasImportedAssignments(user.id);
  const { import: importStatus } = await searchParams;

  if (importedAssignments) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-[78vh] w-full max-w-5xl items-center justify-center">
      <section className="dueable-surface w-full rounded-[34px] px-8 py-10 sm:px-12 sm:py-12">
        <div className="mx-auto grid max-w-3xl justify-items-center gap-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#1dc9b2,_#2d6cdf)] text-lg font-bold text-white shadow-[0_18px_30px_-18px_rgba(31,183,143,0.55)]">
            ✓
          </div>

          <div className="space-y-4">
            <p className="dueable-eyebrow text-[#9aa7bd]">Semester setup</p>
            <h1 className="dueable-display text-[3.1rem] leading-[0.95] tracking-[-0.05em] text-[#0f172a] sm:text-[4rem]">
              Set up your semester.
            </h1>
            <p className="mx-auto max-w-xl text-[1.02rem] leading-8 text-[#6f7f99]">
              Import your assignments and rubrics from Canvas so Dueable can organize what you need to work on.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-[14px] border border-[#efe2d6] bg-[#fff7f2] px-4 py-2 text-sm font-semibold text-[#cf6b48]">Canvas</span>
            <span className="rounded-[14px] border border-[#d8e5f8] bg-[#f4f8ff] px-4 py-2 text-sm font-semibold text-[#2d6cdf]">Dueable</span>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <section className="dueable-soft-panel rounded-[24px] bg-[linear-gradient(180deg,_rgba(237,243,255,0.92),_rgba(255,255,255,0.96))] p-6">
            <p className="dueable-eyebrow text-[#2d6cdf]">Step 1</p>
            <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.03em] text-[#0f172a]">Install the Chrome extension</h2>
            <p className="mt-3 text-base leading-7 text-[#5f6f89]">Keep Dueable next to Canvas so you can sync without changing tabs.</p>
            <a
              href="chrome://extensions"
              className="dueable-button-primary mt-6 inline-flex min-h-14 items-center justify-center px-6 py-4 text-[1.02rem] font-semibold"
            >
              Install extension
            </a>
          </section>

          <section className="dueable-soft-panel rounded-[24px] bg-[linear-gradient(180deg,_rgba(50,196,154,0.18),_rgba(255,255,255,0.96))] p-6">
            <p className="dueable-eyebrow text-[#2e8f70]">Step 2</p>
            <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.03em] text-[#0f172a]">Open Canvas</h2>
            <p className="mt-3 text-base leading-7 text-[#5f6f89]">Stay on your Canvas dashboard or a course page before opening the extension.</p>
          </section>

          <section className="dueable-soft-panel rounded-[24px] bg-[linear-gradient(180deg,_rgba(255,185,138,0.22),_rgba(255,255,255,0.96))] p-6">
            <p className="dueable-eyebrow text-[#b86c3f]">Step 3</p>
            <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.03em] text-[#0f172a]">Import your semester</h2>
            <p className="mt-3 text-base leading-7 text-[#5f6f89]">Bring over your active assignments so Dueable can rank what matters now.</p>
          </section>
        </div>

        {importStatus === "missing" ? (
          <p className="mx-auto mt-8 max-w-2xl rounded-[20px] bg-[#fff4ec] px-5 py-4 text-center text-base leading-7 text-[#9a5f39]">
            We couldn&apos;t find your assignments yet. Try importing again or refresh after the import finishes.
          </p>
        ) : null}

        <form action={completeOnboardingImportCheck} className="mt-8 flex justify-center">
          <button type="submit" className="dueable-button-secondary inline-flex min-h-14 items-center justify-center px-7 py-4 text-[1.02rem] font-semibold hover:text-[#51627f]">
            I&apos;m done importing
          </button>
        </form>
      </section>
    </main>
  );
}