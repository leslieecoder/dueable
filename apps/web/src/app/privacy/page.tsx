import Image from "next/image";
import Link from "next/link";

const sections = [
  {
    title: "Information we collect",
    items: [
      "Account details you provide when you create or use a Dueable account, such as your name and email address.",
      "Course and assignment data imported from your LMS through the Dueable Chrome extension, including course titles, assignment titles, descriptions, due dates, availability windows, points possible, and assignment links.",
      "Progress data created while you use Dueable, such as generated task lists, assignment completion state, and focus-session planning data.",
      "Limited extension-side state stored in your browser through Chrome storage, including auth handoff state and focus-timer state needed to keep the extension working.",
    ],
  },
  {
    title: "How we use information",
    items: [
      "To authenticate you, connect the extension to your Dueable account, and show your dashboard and assignment queue.",
      "To import your course and assignment data, rank what needs attention first, and generate the queue shown in the extension and web app.",
      "To create assignment plans and task breakdowns, including AI-assisted planning when that feature is enabled.",
      "To keep your progress in sync across the Dueable web app and Chrome extension.",
    ],
  },
  {
    title: "Third-party services",
    items: [
      "Dueable uses Supabase for authentication and application data storage.",
      "Dueable may send assignment content needed for plan generation to Google's Gemini API when AI planning is used. If Gemini is unavailable, Dueable falls back to a rule-based planner.",
      "Dueable connects to your LMS through the Chrome extension only to read the course and assignment information needed to power the product experience.",
    ],
  },
  {
    title: "How information is shared",
    items: [
      "We share information only with service providers that help run Dueable, such as hosting, authentication, storage, and AI-planning providers.",
      "We do not use imported course or assignment data to sell your information.",
      "We may disclose information if required to comply with law, regulation, or a valid legal request.",
    ],
  },
  {
    title: "Retention and deletion",
    items: [
      "Account, course, assignment, task, and progress data remains in Dueable until it is removed from the product or deleted in response to a valid user request.",
      "Extension-side local state may remain in your browser until you clear the extension's local storage or remove the extension.",
      "If you want your Dueable data deleted, use the support contact provided in the Chrome Web Store listing or the Dueable website support channel once published.",
    ],
  },
  {
    title: "Your choices",
    items: [
      "You can stop future LMS imports by not using the extension import flow.",
      "You can remove local extension data by uninstalling the extension or clearing its browser storage.",
      "You can stop using the web app and extension at any time.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-[#10213f]">
      <section className="border-b border-[#e8edf6] bg-[radial-gradient(circle_at_top_left,rgba(72,117,255,0.14),transparent_24%),linear-gradient(180deg,#f8faff_0%,#f7f8fc_100%)]">
        <div className="mx-auto max-w-5xl px-6 py-6 sm:px-10 lg:px-12">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image src="/assets/complete-logo.png" alt="Dueable" width={132} height={34} className="h-auto w-33" priority />
            </Link>
            <Link href="/" className="text-sm font-medium text-[#3f5f9b] transition hover:text-[#173a7b]">
              Back to home
            </Link>
          </div>

          <div className="max-w-3xl py-14 sm:py-18">
            <p className="dueable-eyebrow text-[#5f7ec2]">Privacy policy</p>
            <h1 className="mt-5 font-(family-name:--font-fraunces) text-[3rem] leading-[0.94] tracking-tighter text-[#17233f] sm:text-[4.2rem]">
              How Dueable handles your data.
            </h1>
            <p className="mt-6 max-w-2xl text-[1.05rem] leading-8 text-[#74819a] sm:text-[1.1rem]">
              This page explains what information the Dueable web app and Chrome extension collect, how that information is used, and what happens to data imported from your LMS.
            </p>
            <p className="mt-4 text-sm text-[#90a0b8]">Effective date: August 5, 2026</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14 sm:px-10 lg:px-12 lg:py-18">
        <div className="grid gap-6">
          <article className="rounded-[28px] border border-[#e6ebf4] bg-white p-7 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.22)] sm:p-9">
            <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-[#17233f]">Summary</h2>
            <p className="mt-4 text-[1rem] leading-8 text-[#708099]">
              Dueable is built to help students organize coursework. To do that, the product needs account information, LMS assignment data, and saved progress data. Some planning features may also send assignment details to an AI provider so Dueable can generate a suggested task breakdown.
            </p>
          </article>

          {sections.map((section) => (
            <article key={section.title} className="rounded-[28px] border border-[#e6ebf4] bg-white p-7 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.18)] sm:p-9">
              <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-[#17233f]">{section.title}</h2>
              <ul className="mt-5 space-y-4 text-[1rem] leading-8 text-[#708099]">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-[#3f73ea]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}

          <article className="rounded-[28px] border border-[#d9e4f4] bg-[#132239] p-7 text-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)] sm:p-9">
            <h2 className="text-[1.5rem] font-semibold tracking-[-0.03em]">Changes to this policy</h2>
            <p className="mt-4 max-w-3xl text-[1rem] leading-8 text-[#c2cde0]">
              Dueable may update this privacy policy as the product changes. When that happens, we will update the effective date on this page and publish the revised version at this same URL.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}