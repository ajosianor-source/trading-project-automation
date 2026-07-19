import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function Button({ className, variant = "primary", size = "md", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "icon" && "size-9",
        variant === "primary" && "bg-primary text-white shadow-sm hover:brightness-110",
        variant === "outline" && "border border-border bg-card hover:bg-muted/50",
        variant === "ghost" && "hover:bg-muted/60",
        variant === "danger" && "bg-danger text-white hover:brightness-110",
        className,
      )}
      {...props}
    />
  );
}
