import type { Metadata } from "next";
import { AuthSessionProvider } from "@/features/auth/auth-session-provider";
import { getCurrentUser } from "@/lib/auth/session";
import { Comfortaa, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Dueable",
  description: "An academic planner that turns Canvas assignments into clear daily work.",
  icons: {
    icon: "/assets/logo.png",
    shortcut: "/assets/logo.png",
    apple: "/assets/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${comfortaa.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthSessionProvider initialUser={user}>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
