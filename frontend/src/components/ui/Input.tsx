import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, hint, className, id, ...rest }, ref) {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    return (
      <label htmlFor={inputId} className="flex flex-col gap-2">
        {label ? (
          <span className="text-sm font-semibold tracking-tight">{label}</span>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "h-12 w-full rounded-2xl border-ink-3 bg-white px-4 text-base outline-none placeholder:text-ink/40 focus:ring-4 focus:ring-yellow/60",
            className,
          )}
          {...rest}
        />
        {hint ? <span className="text-xs text-ink/60">{hint}</span> : null}
      </label>
    );
  },
);
