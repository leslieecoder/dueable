import { AuthForm } from "@/features/auth/auth-form";
import { loginAction, signInWithGoogleAction } from "@/features/auth/actions";
import { initialAuthActionState } from "@/features/auth/auth-state";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-16 sm:px-10">
      <AuthForm
        title="Welcome back"
        description="Sign in to pick up where you left off and get back to the next step that matters today."
        submitLabel="Log in"
        footerPrompt="Need an account?"
        footerLinkLabel="Sign up"
        footerHref="/signup"
        action={loginAction}
        initialState={initialAuthActionState}
        oauthGoogleAction={signInWithGoogleAction}
        oauthGoogleLabel="Continue with Google"
        fields={[
          { name: "next", label: "Next", type: "hidden", defaultValue: next ?? "/onboarding" },
          { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
          { name: "password", label: "Password", type: "password", placeholder: "Enter your password" },
        ]}
      />
    </main>
  );
}