import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn("h-10 w-full rounded-xl border bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";
