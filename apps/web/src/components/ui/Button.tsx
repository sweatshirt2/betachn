import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonTone = 'primary' | 'quiet';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  children: ReactNode;
};

const TONES: Record<ButtonTone, string> = {
  primary: 'bg-primary-wash shadow-soft hover:shadow-glow',
  quiet: 'bg-surface-alt text-ink border-line shadow-soft hover:shadow-glow border',
};

/** Buttons press with a spring and glow on hover — playful, never heavy. */
export function Button({ tone = 'primary', children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`tap-spring border-line text-terracotta-ink rounded-md border border-transparent px-4 py-2 font-body text-sm font-semibold ${TONES[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
