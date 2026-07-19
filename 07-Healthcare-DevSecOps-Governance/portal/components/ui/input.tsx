import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn("h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-foreground/40 focus:ring-2 focus:ring-primary/30", className)} {...props} />
  ),
);
Input.displayName = "Input";

