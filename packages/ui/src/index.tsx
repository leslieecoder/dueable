import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";

function cx(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

const shellVariants = cva(
  "rounded-[24px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.25)]",
  {
    variants: {
      tone: {
        default: "",
        muted: "bg-slate-50/80",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

export function PackageShell({ children, tone }: { children: ReactNode; tone?: VariantProps<typeof shellVariants>["tone"] }) {
  return <div className={shellVariants({ tone })}>{children}</div>;
}

export function PackageButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}