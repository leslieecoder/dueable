import Link from "next/link";

interface AssignmentFocusHeroProps {
  assignmentId: string;
  assignmentTitle: string;
  courseTitle: string;
  dueLabel: string;
  pointsLabel: string | null;
  estimatedTimeLabel: string;
  progressLabel: string;
  nextActionTitle: string;
  nextActionTimeLabel: string;
  nextActionDuration: number;
  nextActionId: string | null;
  ctaLabel: string;
  whyNowReasons: string[];
  firstActionAnchor: string;
}

export function AssignmentFocusHero({
  assignmentId,
  assignmentTitle,
  courseTitle,
  dueLabel,
  pointsLabel,
  estimatedTimeLabel,
  progressLabel,
  nextActionTitle,
  nextActionTimeLabel,
  nextActionDuration,
  nextActionId,
  ctaLabel,
  whyNowReasons,
  firstActionAnchor,
}: AssignmentFocusHeroProps) {
  return (
    <section className="dueable-surface relative overflow-hidden rounded-4xl p-6 sm:p-7 lg:p-9">
      <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-[#edf3ff] blur-2xl" />
      <div className="relative space-y-7">
        <div>
          <p className="dueable-eyebrow text-[#9aa7bd]">Assignment action plan</p>
          <h1 className="dueable-display mt-4 max-w-4xl text-[3rem] leading-[0.95] tracking-tighter text-[#0f172a] sm:text-[3.8rem]">{assignmentTitle}</h1>
          <p className="mt-5 text-[1.05rem] text-[#7b88a2]">{courseTitle}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[1rem] text-[#5f6f89]">
            <span className="rounded-full bg-[#eef4ff] px-4 py-2.5 font-semibold text-[#2d6cdf]">{dueLabel}</span>
            {pointsLabel ? <span className="rounded-full bg-[#fff8eb] px-4 py-2.5 font-semibold text-[#9a6a17]">{pointsLabel}</span> : null}
            <span className="rounded-full bg-[#eef9f5] px-4 py-2.5 font-semibold text-[#19805f]">{estimatedTimeLabel}</span>
            <span className="rounded-full bg-[#f5f7fb] px-4 py-2.5 font-semibold text-[#5f6f89]">{progressLabel}</span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="rounded-3xl bg-[linear-gradient(135deg,rgba(255,185,138,0.18),rgba(50,196,154,0.12),rgba(45,108,223,0.06))] p-6 sm:p-7">
            <p className="dueable-eyebrow text-[#5a8b7d]">Your first step</p>
            <p className="mt-5 max-w-3xl text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-[#173d4d]">{nextActionTitle}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[1rem] text-[#5f7b76]">
              <span className="rounded-full bg-white/85 px-4 py-2 font-semibold text-[#1b5e52]">{nextActionTimeLabel}</span>
              <span>Stay with only this step for the next few minutes.</span>
            </div>
            <Link href={firstActionAnchor} className="dueable-button-primary mt-7 inline-flex min-h-14 items-center justify-center px-7 py-4 text-[1.08rem] font-semibold">
              {ctaLabel}
            </Link>
            <div className="mt-5 rounded-[20px] bg-white/85 px-5 py-4 text-base leading-7 text-[#49666d]">
              Start with the next unfinished step first. After that, continue down the roadmap below instead of juggling the whole assignment at once.
            </div>
          </div>

          <div className="rounded-3xl bg-[#fbfcff] p-6 sm:p-7">
            <p className="dueable-eyebrow text-[#9aa7bd]">Why this now</p>
            <p className="mt-4 text-[1rem] leading-8 text-[#6b7a94]">Dueable chose this because it is the best place to make progress right now.</p>
            <ul className="mt-5 space-y-3 text-[1rem] leading-7 text-[#4f627d]">
              {whyNowReasons.map((reason) => (
                <li key={reason} className="flex items-start gap-3">
                  <span className="font-semibold text-[#2d6cdf]">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}