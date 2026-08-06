import Image from "next/image";
import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  CheckCircle2,
  CirclePlay,
  Clock3,
  ExternalLink,
  LayoutDashboard,
  ListTodo,
  Sparkles,
  Star,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";

const stats = [
  { value: "48,000+", label: "Students using Dueable" },
  { value: "2.1M", label: "Assignments organized" },
  { value: "94%", label: "Say they miss less work" },
  { value: "4.8", label: "Chrome store rating", icon: Star },
];

const features = [
  {
    title: "Always know what to do next",
    body: "Dueable pulls in your assignments, weighs what is due first, and keeps one clear next move at the top of the queue.",
    eyebrow: "Smart queue",
    icon: ListTodo,
    accent: "from-[#e7f2ff] to-[#f9fbff]",
  },
  {
    title: "Built-in focus sessions",
    body: "Every assignment comes with a timer, session targets, and just enough structure to help you start without spiraling.",
    eyebrow: "Focus sessions",
    icon: AlarmClock,
    accent: "from-[#ecfff8] to-[#fbfffd]",
  },
  {
    title: "See momentum build in real time",
    body: "Completed tasks, finished sessions, and cleared assignments all stack up so your progress stops feeling invisible.",
    eyebrow: "Progress tracking",
    icon: CheckCircle2,
    accent: "from-[#fff6df] to-[#fffdf6]",
  },
  {
    title: "Works right inside your LMS",
    body: "Install the Chrome extension once and keep Dueable beside your coursework instead of bouncing between tabs.",
    eyebrow: "Browser extension",
    icon: LayoutDashboard,
    accent: "from-[#eef2ff] to-[#fcfdff]",
  },
  {
    title: "Catch up on what slipped",
    body: "Overdue work gets its own lane, so you can triage the mess fast instead of scanning one giant list.",
    eyebrow: "Overdue rescue",
    icon: Clock3,
    accent: "from-[#fff0e8] to-[#fffaf7]",
  },
  {
    title: "Start earlier when it matters",
    body: "Work-ahead only shows up when it is actually worth starting early, not just because a due date exists.",
    eyebrow: "Work ahead",
    icon: Sparkles,
    accent: "from-[#ebfff4] to-[#fbfffd]",
  },
];

const steps = [
  {
    number: "01",
    title: "Install the extension",
    body: "Add Dueable to Chrome and connect it to Canvas so your assignments start showing up automatically.",
  },
  {
    number: "02",
    title: "Your priority queue appears",
    body: "Dueable reads your coursework and builds a ranked queue of what deserves your attention first.",
  },
  {
    number: "03",
    title: "Start a focus session",
    body: "Open the assignment, set the number of focus sessions you need, and start working right away.",
  },
  {
    number: "04",
    title: "Watch your progress add up",
    body: "Each finished step moves the queue forward so you can see real progress instead of guessing.",
  },
];

const stories = [
  {
    quote: "The priority queue is the first thing that actually told me what to do next instead of giving me another dashboard to decode.",
    name: "Aisha T.",
    detail: "Business Administration",
    initials: "AT",
  },
  {
    quote: "The Pomodoro timer inside each assignment is what made me use it daily. I know exactly how many sessions a chapter takes now.",
    name: "Jake M.",
    detail: "Psychology, Pre-med",
    initials: "JM",
  },
  {
    quote: "I had 35 overdue assignments when I started. The overdue queue helped me climb back out systematically instead of panicking.",
    name: "Sofia C.",
    detail: "Marketing & Design",
    initials: "SC",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/extension" : "/login?next=%2Fextension";
  const secondaryHref = user ? "/dashboard" : "/login?next=%2Fdashboard";

  return (
    <main className="overflow-x-hidden bg-[#f7f8fc] text-[#10213f]">
      <section className="relative isolate border-b border-[#e8edf6] bg-[radial-gradient(circle_at_top_left,rgba(72,117,255,0.14),transparent_25%),radial-gradient(circle_at_82%_16%,rgba(18,201,151,0.10),transparent_18%),linear-gradient(180deg,#f8faff_0%,#f7f8fc_100%)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10 lg:px-12">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image src="/assets/complete-logo.png" alt="Dueable" width={132} height={34} priority className="h-auto w-[132px]" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#5270ab] md:flex">
            <a href="#features" className="transition hover:text-[#234a9d]">Features</a>
            <a href="#how-it-works" className="transition hover:text-[#234a9d]">How it works</a>
            <a href="#students" className="transition hover:text-[#234a9d]">For students</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={primaryHref}
              className="dueable-button-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white"
            >
              Get Extension - Free
            </Link>
            <Link href={user ? "/dashboard" : "/login?next=%2Fextension"} className="text-sm font-medium text-[#3f5f9b] transition hover:text-[#173a7b]">
              {user ? "Dashboard" : "Sign in"}
            </Link>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-16 px-6 pb-18 pt-10 sm:px-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:px-12 lg:pb-24 lg:pt-16">
          <div className="max-w-2xl self-center">
            <p className="dueable-eyebrow text-[#5f7ec2]">Built for the student tab spiral</p>
            <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-[3.45rem] leading-[0.92] tracking-[-0.06em] text-[#17233f] sm:text-[4.8rem]">
              Stop drowning
              <br />
              in <span className="bg-gradient-to-r from-[#3f79ff] to-[#4d8efb] bg-clip-text italic text-transparent">assignments.</span>
              <br />
              Start finishing
              <br />
              them.
            </h1>
            <p className="mt-7 max-w-xl text-[1.05rem] leading-8 text-[#7b87a1] sm:text-[1.12rem]">
              Dueable connects to Canvas, pulls your assignments into one ranked queue, and gives you built-in focus sessions so you know what to start and how long to stay on it.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href={primaryHref}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#3873ef] px-7 py-4 text-[1.02rem] font-semibold text-white shadow-[0_22px_34px_-22px_rgba(45,108,223,0.7)] transition hover:bg-[#2f66dc]"
              >
                Get Chrome Extension - Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={secondaryHref}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#dbe4f3] bg-white px-6 py-4 text-[1rem] font-semibold text-[#31508e] shadow-[0_18px_34px_-28px_rgba(15,23,42,0.28)] transition hover:border-[#c8d5ee] hover:text-[#223e77]"
              >
                {user ? "Open web app" : "See the dashboard"}
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="absolute inset-x-6 top-10 h-72 rounded-full bg-[radial-gradient(circle,rgba(55,112,239,0.18),transparent_60%)] blur-3xl sm:inset-x-16" />
            <div className="relative w-full max-w-[610px]">
              <div className="relative rounded-[28px] border border-[#dde5f4] bg-[#13233d] p-3 shadow-[0_38px_80px_-34px_rgba(18,35,61,0.42)]">
                <div className="flex items-center gap-2 rounded-[18px] bg-[#0f1d34] px-4 py-3 text-[0.72rem] text-[#9cb0d1]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff6d5b]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffbf47]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2dcc7d]" />
                  <span className="ml-3 truncate">app.dueable.com</span>
                </div>
                <div className="mt-3 overflow-hidden rounded-[22px] bg-[#f6f8fd]">
                  <div className="grid min-h-[360px] grid-cols-[92px_minmax(0,1fr)] sm:min-h-[390px]">
                    <div className="border-r border-[#e5ebf6] bg-white px-3 py-4">
                      <div className="rounded-2xl bg-[#edf3ff] px-3 py-2 text-[0.72rem] font-semibold text-[#2f62d8]">Home</div>
                      <div className="mt-3 rounded-2xl px-3 py-2 text-[0.72rem] font-semibold text-[#7f90ad]">Extension</div>
                    </div>
                    <div className="relative px-4 py-4 sm:px-5 sm:py-5">
                      <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold text-[#7f8aa1]">
                        <Image src="/assets/complete-logo.png" alt="Dueable" width={78} height={20} className="mr-auto h-auto w-[78px]" />
                        <span className="rounded-full bg-[#f2f6ff] px-2.5 py-1 text-[#4a74d2]">12 active</span>
                        <span className="rounded-full bg-[#fff2ee] px-2.5 py-1 text-[#ef6b4a]">35 overdue</span>
                        <span className="rounded-full bg-[#ecfaf4] px-2.5 py-1 text-[#1a9d65]">2 work ahead</span>
                      </div>
                      <div className="mt-4 rounded-[20px] bg-white p-4 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.3)]">
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#ef6f4d]">#1 Priority</p>
                        <h2 className="mt-2 text-[1.05rem] font-semibold text-[#17233f] sm:text-[1.15rem]">Run lab meeting notes and submit summary</h2>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold">
                          <span className="rounded-full bg-[#fff1eb] px-2.5 py-1 text-[#f06c4b]">Overdue</span>
                          <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[#4675d8]">50 pts</span>
                          <span className="rounded-full bg-[#edf8f3] px-2.5 py-1 text-[#209b64]">7-day streak</span>
                        </div>
                        <div className="mt-4 h-2.5 rounded-full bg-[#edf1f8]">
                          <div className="h-full w-[44%] rounded-full bg-gradient-to-r from-[#3c79f6] to-[#45c89e]" />
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#8190aa]">3 focus sessions</p>
                            <p className="mt-1 text-[0.82rem] text-[#6d7c96]">One assignment, one session, one clear next move.</p>
                          </div>
                          <button type="button" className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2ecc9c] px-4 text-[0.82rem] font-semibold text-white shadow-[0_14px_30px_-18px_rgba(46,204,156,0.8)]">
                            Start this assignment
                          </button>
                        </div>
                      </div>

                      <div className="absolute -left-3 bottom-12 rounded-[18px] bg-white px-4 py-3 shadow-[0_20px_48px_-22px_rgba(15,23,42,0.32)] sm:-left-8">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#f39a3f]">7-day streak</p>
                        <p className="mt-1 text-[0.82rem] font-medium text-[#5a6984]">Keep it up!</p>
                      </div>

                      <div className="absolute -right-2 top-24 w-[168px] rounded-[22px] bg-white p-4 shadow-[0_24px_54px_-26px_rgba(45,108,223,0.45)] sm:-right-8 sm:w-[188px]">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ea8ba]">Focus session</p>
                        <p className="mt-2 text-[2rem] font-semibold leading-none text-[#2f64d8]">25:00</p>
                        <div className="mt-4 flex gap-2 text-[0.66rem] font-semibold text-[#74839d]">
                          <span className="rounded-full bg-[#f1f5fd] px-2 py-1">Work</span>
                          <span className="rounded-full bg-[#f8fafc] px-2 py-1">Break next</span>
                        </div>
                        <button type="button" className="mt-4 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-2xl bg-[#3873ef] px-3 text-[0.78rem] font-semibold text-white">
                          <CirclePlay className="h-3.5 w-3.5" />
                          Start
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e7ebf4] bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-9 sm:grid-cols-4 sm:px-10 lg:px-12">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-[2rem] font-semibold tracking-[-0.05em] text-[#1b2742] sm:text-[2.3rem]">
                  <span>{stat.value}</span>
                  {Icon ? <Icon className="h-5 w-5 fill-[#1b2742] text-[#1b2742]" /> : null}
                </div>
                <p className="mt-2 text-sm text-[#98a3b7]">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="features" className="border-b border-[#e7ebf4] bg-[#f4f6fa] py-22 sm:py-26">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-12">
          <div className="text-center">
            <p className="dueable-eyebrow text-[#5d86e7]">Features</p>
            <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-[2.8rem] leading-[0.98] tracking-[-0.05em] text-[#17233f] sm:text-[3.8rem]">
              Everything you need to
              <br />
              <span className="bg-gradient-to-r from-[#3c79f6] to-[#2dbd92] bg-clip-text italic text-transparent">stop guessing and start finishing</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className={`rounded-[28px] border border-white/80 bg-gradient-to-b ${feature.accent} p-7 shadow-[0_20px_46px_-34px_rgba(15,23,42,0.22)]`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#5282ef] shadow-[0_14px_28px_-20px_rgba(45,108,223,0.45)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="dueable-eyebrow mt-6 text-[#5d86e7]">{feature.eyebrow}</p>
                  <h3 className="mt-3 text-[1.28rem] font-semibold tracking-[-0.03em] text-[#16233f]">{feature.title}</h3>
                  <p className="mt-3 text-[0.98rem] leading-7 text-[#73819b]">{feature.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-[#e7ebf4] bg-white py-22 sm:py-26">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 sm:px-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-12">
          <div className="max-w-2xl">
            <p className="dueable-eyebrow text-[#5d86e7]">How it works</p>
            <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-[2.8rem] leading-[0.98] tracking-[-0.05em] text-[#17233f] sm:text-[3.8rem]">
              Up and running in
              <br />
              <span className="bg-gradient-to-r from-[#2abf95] to-[#1ea97d] bg-clip-text italic text-transparent">under 2 minutes</span>
            </h2>

            <div className="mt-10 space-y-8">
              {steps.map((step) => (
                <div key={step.number} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#dbe5f5] bg-[#f7faff] text-sm font-semibold text-[#3c73ea]">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-[1.08rem] font-semibold text-[#16233f]">{step.title}</h3>
                    <p className="mt-2 max-w-xl text-[0.98rem] leading-7 text-[#74819a]">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[34px] border border-[#dfe6f2] bg-[linear-gradient(145deg,#203754_0%,#0f1d31_100%)] p-4 shadow-[0_40px_80px_-44px_rgba(15,23,42,0.5)]">
              <div className="overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)),linear-gradient(180deg,#1e2d41_0%,#152337_100%)] p-8 sm:p-10">
                <div className="mx-auto max-w-[380px] rounded-[28px] bg-white/94 p-6 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.55)] backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8efff] text-sm font-semibold text-[#3f73ea]">MR</div>
                    <div>
                      <p className="text-sm font-semibold text-[#16233f]">Marcus R.</p>
                      <p className="text-xs text-[#8090ac]">Junior, Communication Studies</p>
                    </div>
                  </div>
                  <p className="mt-5 font-[family-name:var(--font-fraunces)] text-[1.45rem] leading-[1.25] tracking-[-0.03em] text-[#18243e]">
                    &ldquo;I used to waste time figuring out where to start. Now I open Dueable and follow the queue.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="students" className="border-b border-[#e7ebf4] bg-[#f4f6fa] py-22 sm:py-26">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-12">
          <div className="text-center">
            <p className="dueable-eyebrow text-[#5d86e7]">Student stories</p>
            <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-[2.8rem] leading-[0.98] tracking-[-0.05em] text-[#17233f] sm:text-[3.6rem]">Students who turned it around</h2>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {stories.map((story) => (
              <article key={story.name} className="rounded-[28px] border border-white/80 bg-white p-7 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
                <div className="flex gap-1 text-[#ffb949]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={`${story.name}-${index}`} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-5 text-[1rem] leading-7 text-[#233350]">&ldquo;{story.quote}&rdquo;</p>
                <div className="mt-8 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3f73ea] text-xs font-semibold text-white">{story.initials}</div>
                  <div>
                    <p className="text-sm font-semibold text-[#16233f]">{story.name}</p>
                    <p className="text-xs text-[#8190aa]">{story.detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#132239] px-6 py-20 text-white sm:px-10 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="dueable-eyebrow text-[#6f8ec5]">Get started today</p>
          <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-[3rem] leading-[0.96] tracking-[-0.05em] sm:text-[4.3rem]">
            Your assignments
            <br />
            won&apos;t wait.
            <br />
            <span className="bg-gradient-to-r from-[#37d1a7] to-[#22a77d] bg-clip-text italic text-transparent">Neither should you.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[1.02rem] leading-8 text-[#8ea0be]">
            Install the extension, open your queue, and start chipping away at the work that actually matters first.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={primaryHref}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#3873ef] px-7 py-4 text-[1rem] font-semibold text-white shadow-[0_22px_38px_-22px_rgba(56,115,239,0.7)] transition hover:bg-[#3068dd]"
            >
              Get Chrome Extension - Free
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/4 px-7 py-4 text-[1rem] font-semibold text-[#d8e2f5] transition hover:border-white/22 hover:bg-white/6"
            >
              Open Web App
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-5 text-sm text-[#667a9d]">Free to start. Built for students who need a cleaner way to get through the week.</p>
        </div>
      </section>
    </main>
  );
}
