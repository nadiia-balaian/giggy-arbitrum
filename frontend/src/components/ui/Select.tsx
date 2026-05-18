import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> & {
  label?: string;
  options: Option[];
  hint?: string;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, options, hint, className, id, ...rest }, ref) {
    const reactId = React.useId();
    const selectId = id ?? reactId;
    return (
      <label htmlFor={selectId} className="flex flex-col gap-2">
        {label ? (
          <span className="text-sm font-semibold tracking-tight">{label}</span>
        ) : null}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "h-12 w-full appearance-none rounded-2xl border-ink-3 bg-white px-4 pr-10 text-base outline-none focus:ring-4 focus:ring-yellow/60",
              className,
            )}
            {...rest}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2" />
        </div>
        {hint ? <span className="text-xs text-ink/60">{hint}</span> : null}
      </label>
    );
  },
);
