import { cn } from "@/lib/cn";

export type Variant = "primary" | "secondary" | "ghost" | "danger" | "tonal";
export const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary-500 text-white hover:bg-primary-600 shadow-sm shadow-primary-500/20",
  tonal: "bg-primary-100 text-primary-800 hover:bg-primary-200 dark:bg-primary-500/15 dark:text-primary-200 dark:hover:bg-primary-500/25",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
  ghost: "text-muted hover:text-ink hover:bg-surface-2",
  danger: "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
};

export function buttonClass(variant: Variant = "primary", size: "sm" | "md" | "lg" = "md", className?: string) {
  return cn("inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors whitespace-nowrap",
    size === "sm" ? "h-8 px-3 text-[13px]" : size === "lg" ? "h-12 px-6 text-[15px]" : "h-10 px-4 text-sm", VARIANTS[variant], className);
}
