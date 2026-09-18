'use client';

import type { CSSProperties, ReactNode } from 'react';

/**
 * Account switcher card (§4.6) — ONE member, self-contained:
 * emoji tile + name + who-is-this line + a state zone on the right that is
 * exactly one of three things:
 *   'active'   — "In use" pill; the card is inert.
 *   'password' — inline password gate, revealed inside the same card so the
 *                list never shifts; Enter submits, focus lands automatically.
 *   'pick'     — the whole card is the tap target; spring press on hover.
 *
 * The list above stays level: every row keeps its height whatever the state,
 * so the sheet reads as one decorated wall of family tiles, not a form.
 */

export type AccountSwitcherStatus = 'active' | 'password' | 'pick';

export function AccountSwitcherCard({
  name,
  who,
  status,
  activePerson,
  password,
  passwordError,
  busy,
  onPasswordChange,
  onSubmitPassword,
  onCancelPassword,
  onPick,
  index = 0,
  style,
}: {
  /** Person display name — initial renders on the avatar tile. */
  name: string;
  /** The identity line under the name — role, relation, or "no role". */
  who?: ReactNode;
  status: AccountSwitcherStatus;
  activePerson?: ReactNode;
  password?: string;
  passwordError?: ReactNode;
  busy?: boolean;
  onPasswordChange?: (value: string) => void;
  onSubmitPassword?: () => void;
  onCancelPassword?: () => void;
  onPick?: () => void;
  index?: number;
  style?: CSSProperties;
}) {
  const tile = (
    <span
      aria-hidden
      className="shadow-soft font-display inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[34%] text-lg font-bold leading-none text-ink"
      style={{ background: `var(--chorify-crayon-${(index % 4) + 1})` }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );

  const identity = (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[15px] font-bold leading-tight text-ink">{name}</span>
      {who != null && <span className="text-muted mt-0.5 block truncate text-xs font-semibold">{who}</span>}
    </span>
  );

  if (status === 'active') {
    return (
      <div
        style={style}
        className="border-line bg-card-wash shadow-soft flex items-center gap-3 rounded-lg border p-2.5"
        data-active-account
      >
        {tile}
        {identity}
        {activePerson != null && (
          <span className="bg-accent-wash text-ink shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold">
            {activePerson}
          </span>
        )}
      </div>
    );
  }

  if (status === 'password') {
    return (
      <div
        style={style}
        className="border-line bg-card-wash shadow-soft relative flex items-center gap-3 rounded-lg border p-2.5"
      >
        {tile}
        {identity}
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitPassword?.();
          }}
        >
          <input
            type="password"
            autoFocus
            value={password ?? ''}
            onChange={(event) => onPasswordChange?.(event.target.value)}
            aria-label={name}
            className="border-line bg-surface text-ink placeholder:text-muted/60 h-8 w-28 rounded-full border px-3 text-xs font-semibold outline-none focus:border-[var(--chorify-primary)]"
          />
          <button
            type="submit"
            disabled={busy || (password ?? '').length === 0}
            className="bg-accent text-accent-ink tap-spring shadow-soft flex h-8 items-center rounded-full px-3 text-xs font-bold disabled:opacity-50"
          >
            →
          </button>
          <button
            type="button"
            onClick={onCancelPassword}
            className="text-muted tap-spring flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
            aria-label="cancel"
          >
            ✕
          </button>
        </form>
        {passwordError != null && (
          <span
            role="alert"
            className="bg-clay-red/20 shadow-soft absolute bottom-1 left-14 rounded-full px-2 py-0.5 text-[10px] font-bold text-ink"
          >
            {passwordError}
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      style={style}
      onClick={onPick}
      disabled={busy}
      className="border-line bg-card-wash shadow-soft tap-spring lift-hover text-ink flex w-full items-center gap-3 rounded-lg border p-2.5 text-left disabled:opacity-50"
    >
      {tile}
      {identity}
      <span className="text-muted shrink-0 pr-1" aria-hidden>
        ›
      </span>
    </button>
  );
}
