import * as React from "react";
import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, hint, className, id, rows = 4, ...rest }, ref) {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    return (
      <label htmlFor={inputId} className="flex flex-col gap-2">
        {label ? (
          <span className="text-sm font-semibold tracking-tight">{label}</span>
        ) : null}
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          className={cn(
            "w-full rounded-2xl border-ink-3 bg-white px-4 py-3 text-base outline-none placeholder:text-ink/40 focus:ring-4 focus:ring-yellow/60",
            className,
          )}
          {...rest}
        />
        {hint ? <span className="text-xs text-ink/60">{hint}</span> : null}
      </label>
    );
  },
);
