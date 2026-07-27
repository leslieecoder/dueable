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
    <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center">
      <section className="dueable-surface w-full rounded-[28px] p-8 sm:p-10">
        <div className="max-w-2xl space-y-5">
          <p className="dueable-eyebrow text-[#9aa7bd]">Onboarding</p>
          <h1 className="dueable-display text-[3rem] leading-[0.96] tracking-[-0.05em] text-[#0f172a] sm:text-[3.75rem]">
            Let&apos;s get your semester ready.
          </h1>
          <p className="text-[1.05rem] leading-8 text-[#6f7f99]">
            Import your current Canvas assignments so Dueable can help you focus on what matters each day.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <section className="rounded-[24px] bg-[linear-gradient(180deg,_rgba(237,243,255,0.92),_rgba(255,255,255,0.96))] p-6">
            <p className="dueable-eyebrow text-[#2d6cdf]">Step 1</p>
            <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.03em] text-[#0f172a]">Install the Dueable Chrome Extension</h2>
            <p className="mt-3 text-base leading-7 text-[#5f6f89]">Import your Canvas assignments securely.</p>
            <a
              href="chrome://extensions"
              className="dueable-button-primary mt-6 inline-flex min-h-14 items-center justify-center px-6 py-4 text-[1.05rem] font-semibold"
            >
              Install Extension
            </a>
          </section>

          <section className="rounded-[24px] bg-[linear-gradient(180deg,_rgba(50,196,154,0.18),_rgba(255,255,255,0.96))] p-6">
            <p className="dueable-eyebrow text-[#2e8f70]">Step 2</p>
            <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.03em] text-[#0f172a]">Open Canvas</h2>
            <p className="mt-3 text-base leading-7 text-[#5f6f89]">Go to your Canvas Dashboard and click the Dueable extension.</p>
          </section>

          <section className="rounded-[24px] bg-[linear-gradient(180deg,_rgba(255,185,138,0.22),_rgba(255,255,255,0.96))] p-6">
            <p className="dueable-eyebrow text-[#b86c3f]">Step 3</p>
            <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.03em] text-[#0f172a]">Import your current semester</h2>
            <p className="mt-3 text-base leading-7 text-[#5f6f89]">Import only your active semester assignments.</p>
          </section>
        </div>

        {importStatus === "missing" ? (
          <p className="mt-8 rounded-[20px] bg-[#fff4ec] px-5 py-4 text-base leading-7 text-[#9a5f39]">
            We couldn&apos;t find your assignments yet. Try importing again or refresh after the import finishes.
          </p>
        ) : null}

        <form action={completeOnboardingImportCheck} className="mt-8">
          <button type="submit" className="rounded-full bg-white px-6 py-4 text-[1.05rem] font-semibold text-[#2d6cdf] shadow-[0_14px_28px_-24px_rgba(15,23,42,0.35)] hover:text-[#245ec6]">
            I&apos;m done importing
          </button>
        </form>
      </section>
    </main>
  );
}