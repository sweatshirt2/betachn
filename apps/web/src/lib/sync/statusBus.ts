type StatusListener = () => void;

const listeners = new Set<StatusListener>();

/**
 * Sync flushes finish inside the engine, outside React. The bus lets the
 * engine's owner re-poll status immediately instead of waiting out the
 * 5s status cadence.
 */
export function notifyStatusListeners(listener: StatusListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitStatusChanged(): void {
  for (const listener of listeners) listener();
}
