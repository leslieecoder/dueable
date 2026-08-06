"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "ready" | "success" | "error">("idle");
  const [message, setMessage] = useState("Checking your reset link...");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkRecoverySession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setStatus("error");
        setMessage("We couldn't verify your reset link. Request a new one and try again.");
        return;
      }

      if (data.session) {
        setStatus("ready");
        setMessage("Enter your new password.");
        return;
      }

      setStatus("error");
      setMessage("This reset link is invalid or has expired. Request a new password reset email.");
    }

    void checkRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setStatus("error");
      setMessage("Your new password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords must match.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);

    if (error) {
      setStatus("error");
      setMessage("We couldn't update your password. Request a new reset link and try again.");
      return;
    }

    setStatus("success");
    setMessage("Your password has been updated. Redirecting you to login...");
    router.push("/login?next=%2Fextension");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-10">
      <p className="dueable-eyebrow text-sky-700">Dueable</p>
      <h1 className="dueable-display mt-4 text-[2.8rem] leading-[0.96] tracking-[-0.05em] text-slate-950">Choose a new password</h1>
      <p className="mt-4 text-base leading-8 text-slate-600">Reset the password for your Dueable account and get back to your queue.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block space-y-2.5">
          <span className="text-base font-medium text-slate-700">New password</span>
          <input
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-400"
            autoComplete="new-password"
            required
            disabled={status !== "ready" || isSubmitting}
          />
        </label>

        <label className="block space-y-2.5">
          <span className="text-base font-medium text-slate-700">Confirm password</span>
          <input
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-400"
            autoComplete="new-password"
            required
            disabled={status !== "ready" || isSubmitting}
          />
        </label>

        <p className={status === "error" ? "text-base text-rose-600" : "text-base text-slate-600"} aria-live="polite">
          {message}
        </p>

        <button
          type="submit"
          disabled={status !== "ready" || isSubmitting}
          className="dueable-button-primary inline-flex min-h-14 w-full items-center justify-center px-5 py-4 text-[1.05rem] font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Updating..." : "Update password"}
        </button>
      </form>

      <p className="mt-7 text-center text-base text-slate-600">
        Need a new link?{" "}
        <Link href="/forgot-password" className="font-semibold text-sky-700 hover:text-sky-800">
          Request another reset email
        </Link>
      </p>
    </div>
  );
}