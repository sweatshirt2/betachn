import type { InputHTMLAttributes } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Inline, per-input error — spoken under the field via aria-describedby. */
  error?: string;
};

export function Field({ label, error, id, ...rest }: FieldProps) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const errorId = `${fieldId}-error`;
  return (
    <label className="block" htmlFor={fieldId}>
      <span className="text-sm font-semibold">{label}</span>
      <input
        id={fieldId}
        className={`shadow-soft mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 ${
          error
            ? 'border-clay-red focus:border-clay-red focus:ring-clay-red/30 bg-surface text-ink'
            : 'bg-surface-alt text-ink border-line focus:border-terracotta focus:ring-terracotta/30'
        }`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error && (
        <span id={errorId} className="text-clay-red mt-1 block text-xs font-semibold" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
