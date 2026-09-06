import type { InputHTMLAttributes } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Field({ label, error, id, ...rest }: FieldProps) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label className="block" htmlFor={fieldId}>
      <span className="text-sm font-semibold">{label}</span>
      <input
        id={fieldId}
        className="bg-surface text-ink border-line mt-1 w-full rounded-md border px-3 py-2 text-sm"
        {...rest}
      />
      {error && (
        <span className="text-clay-red mt-1 block text-xs" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
