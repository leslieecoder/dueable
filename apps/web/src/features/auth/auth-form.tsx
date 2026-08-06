"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AuthActionState } from "@/features/auth/auth-state";

interface AuthFormField {
  name: string;
  label: string;
  type: "text" | "email" | "password" | "hidden";
  placeholder?: string;
  defaultValue?: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="dueable-button-primary inline-flex min-h-14 w-full items-center justify-center px-5 py-4 text-[1.05rem] font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Working..." : label}
    </button>
  );
}

function SecondaryButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-14 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-4 text-[1.02rem] font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Redirecting..." : label}
    </button>
  );
}

export function AuthForm({
  title,
  description,
  submitLabel,
  auxiliaryLinkLabel,
  auxiliaryLinkHref,
  footerPrompt,
  footerLinkLabel,
  footerHref,
  action,
  initialState,
  fields,
  oauthGoogleAction,
  oauthGoogleLabel,
}: {
  title: string;
  description: string;
  submitLabel: string;
  auxiliaryLinkLabel?: string;
  auxiliaryLinkHref?: string;
  footerPrompt: string;
  footerLinkLabel: string;
  footerHref: string;
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  initialState: AuthActionState;
  fields: AuthFormField[];
  oauthGoogleAction?: (formData: FormData) => Promise<void>;
  oauthGoogleLabel?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const nextField = fields.find((field) => field.name === "next")?.defaultValue ?? "/dashboard";
  const footerLinkWithNext = footerHref.startsWith("/") ? `${footerHref}?next=${encodeURIComponent(nextField)}` : footerHref;
  const auxiliaryLinkWithNext = auxiliaryLinkHref?.startsWith("/") ? `${auxiliaryLinkHref}?next=${encodeURIComponent(nextField)}` : auxiliaryLinkHref;

  return (
    <div className="w-full max-w-md rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-10">
      <p className="dueable-eyebrow text-sky-700">Dueable</p>
      <h1 className="dueable-display mt-4 text-[2.8rem] leading-[0.96] tracking-[-0.05em] text-slate-950">{title}</h1>
      <p className="mt-4 text-base leading-8 text-slate-600">{description}</p>

      {oauthGoogleAction ? (
        <>
          <form action={oauthGoogleAction} className="mt-8">
            <input type="hidden" name="next" defaultValue={nextField} />
            <SecondaryButton label={oauthGoogleLabel ?? "Continue with Google"} />
          </form>
          <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      ) : null}

      <form action={formAction} className="mt-8 space-y-5">
        {fields.map((field) => {
          if (field.type === "hidden") {
            return <input key={field.name} type="hidden" name={field.name} defaultValue={field.defaultValue} />;
          }

          return (
            <label key={field.name} className="block space-y-2.5">
              <span className="text-base font-medium text-slate-700">{field.label}</span>
              <input
                name={field.name}
                type={field.type}
                placeholder={field.placeholder}
                defaultValue={field.defaultValue}
                className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-400"
                autoComplete={field.name}
                required
              />
            </label>
          );
        })}

        {state.message ? (
          <p
            className={state.status === "error" ? "text-base text-rose-600" : "text-base text-emerald-700"}
            aria-live="polite"
          >
            {state.message}
          </p>
        ) : null}

        {auxiliaryLinkWithNext && auxiliaryLinkLabel ? (
          <div className="-mt-1 flex justify-end">
            <Link href={auxiliaryLinkWithNext} className="text-sm font-medium text-sky-700 hover:text-sky-800">
              {auxiliaryLinkLabel}
            </Link>
          </div>
        ) : null}

        <SubmitButton label={submitLabel} />
      </form>

      <p className="mt-7 text-center text-base text-slate-600">
        {footerPrompt}{" "}
        <Link href={footerLinkWithNext} className="font-semibold text-sky-700 hover:text-sky-800">
          {footerLinkLabel}
        </Link>
      </p>
    </div>
  );
}