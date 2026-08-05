import { AuthForm } from "@/features/auth/auth-form";
import { signupAction } from "@/features/auth/actions";
import { initialAuthActionState } from "@/features/auth/auth-state";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-16 sm:px-10">
      <AuthForm
        title="Create your account"
        description="Create your account so Dueable can help you turn your semester into one clear next step at a time."
        submitLabel="Create account"
        footerPrompt="Already have an account?"
        footerLinkLabel="Log in"
        footerHref="/login"
        action={signupAction}
        initialState={initialAuthActionState}
        fields={[
          { name: "next", label: "Next", type: "hidden", defaultValue: next ?? "/onboarding" },
          { name: "name", label: "Name", type: "text", placeholder: "Leslie Cruz" },
          { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
          { name: "password", label: "Password", type: "password", placeholder: "Create a strong password" },
          { name: "confirmPassword", label: "Confirm password", type: "password", placeholder: "Type your password again" },
        ]}
      />
    </main>
  );
}