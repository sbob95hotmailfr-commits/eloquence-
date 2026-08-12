import { ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx(
        "rounded-lg px-4 py-2.5 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" &&
          "bg-encre text-parchemin hover:bg-encre/90 dark:bg-laiton dark:text-encre dark:hover:bg-laiton/90",
        variant === "secondary" &&
          "border border-border-subtle bg-surface hover:bg-surface-muted",
        variant === "ghost" && "hover:bg-surface-muted",
        variant === "danger" &&
          "bg-rouge-correcteur text-white hover:bg-rouge-correcteur/90",
        className
      )}
      {...props}
    />
  );
}
