export type WatermarkVariant = 'leaves' | 'bubbles' | 'house' | 'steam';

/**
 * Background watermark per section (§5.1) — SVG pattern layer at token
 * opacity, aria-hidden, pointer-events-none. Never printed.
 */
export function SectionWatermark({ variant }: { variant: WatermarkVariant }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      data-no-print
      style={{ opacity: 'var(--chorify-watermark-opacity)' }}
    >
      {variant === 'leaves' && <Leaves />}
      {variant === 'bubbles' && <Bubbles />}
      {variant === 'house' && <House />}
      {variant === 'steam' && <Steam />}
    </div>
  );
}

function Leaves() {
  return (
    <svg className="text-olive absolute -right-8 -top-8 h-48 w-48" viewBox="0 0 100 100" fill="currentColor">
      <ellipse cx="50" cy="30" rx="18" ry="28" transform="rotate(20 50 30)" />
      <ellipse cx="30" cy="65" rx="14" ry="22" transform="rotate(-15 30 65)" />
      <ellipse cx="70" cy="70" rx="12" ry="20" transform="rotate(30 70 70)" />
    </svg>
  );
}

function Bubbles() {
  return (
    <svg className="text-sky absolute -left-6 top-10 h-40 w-40" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
      <circle cx="30" cy="30" r="12" />
      <circle cx="60" cy="50" r="18" />
      <circle cx="40" cy="75" r="8" />
    </svg>
  );
}

function House() {
  return (
    <svg className="text-terracotta absolute -right-4 bottom-0 h-44 w-44" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M15 50 L50 20 L85 50 M25 45 V80 H75 V45" />
    </svg>
  );
}

function Steam() {
  return (
    <svg className="text-muted absolute left-1/3 top-0 h-40 w-24" viewBox="0 0 50 100" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M15 90 C10 70 20 60 15 40 C10 20 20 10 15 0" />
      <path d="M35 90 C30 70 40 60 35 40 C30 20 40 10 35 0" />
    </svg>
  );
}
