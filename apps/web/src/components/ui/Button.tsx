import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonTone = 'primary' | 'quiet';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  children: ReactNode;
};

const TONES: Record<ButtonTone, string> = {
  primary: 'bg-terracotta text-terracotta-ink shadow-soft',
  quiet: 'bg-surface text-ink border border-line shadow-soft',
};

export function Button({ tone = 'primary', children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded-md px-4 py-2 font-body text-sm font-semibold transition-transform active:scale-97 ${TONES[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
