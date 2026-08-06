import { AuthForm } from "@/features/auth/auth-form";
import { forgotPasswordAction } from "@/features/auth/actions";
import { initialAuthActionState } from "@/features/auth/auth-state";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-16 sm:px-10">
      <AuthForm
        title="Reset your password"
        description="Enter the email linked to your Dueable account and we'll send you a reset link."
        submitLabel="Send reset link"
        footerPrompt="Remembered it?"
        footerLinkLabel="Back to login"
        footerHref="/login"
        action={forgotPasswordAction}
        initialState={initialAuthActionState}
        fields={[
          { name: "next", label: "Next", type: "hidden", defaultValue: next ?? "/extension" },
          { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
        ]}
      />
    </main>
  );
}