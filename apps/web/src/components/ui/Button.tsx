import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonTone = 'primary' | 'quiet' | 'on-wash';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  children: ReactNode;
};

const TONES: Record<ButtonTone, string> = {
  primary: 'bg-primary-wash text-primary-ink-on shadow-soft hover:shadow-glow',
  quiet: 'bg-surface-alt text-ink border-line shadow-soft hover:shadow-glow border',
  // 'on-wash' quiet actions sit on tinted washes (pantry/shopping rows) where
  // surface-toned ink nearly vanishes — near-solid surface + ink keeps them
  // readable (UI/UX iteration 1 contrast fixes: Buy, Almost out).
  'on-wash': 'bg-surface/90 text-ink border-line shadow-soft hover:shadow-glow border',
};

/** Buttons press with a spring and glow on hover — playful, never heavy.
 * Primary tone paints ink per surface: the pastel primary wash reads best
 * with dark ink; solid `bg-fab`-style surfaces keep white via their own
 * -ink token (the FAB does this). */
export function Button({ tone = 'primary', children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`tap-spring border-line rounded-md border border-transparent px-4 py-2 font-body text-sm font-semibold ${TONES[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
