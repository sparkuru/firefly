export interface DeliveryWorkerOptions {
  readonly deliver: (limit: number) => Promise<{ delivered: number; failed: number }>;
  readonly close: () => void;
  readonly diagnostic?: (code: 'worker_delivered' | 'worker_retry' | 'worker_failed') => void;
  readonly heartbeat?: (active: boolean) => void;
  readonly schedule?: (tick: () => void, milliseconds: number) => () => void;
}

/** One leased message per cycle bounds a production drain to the SMTP deadline. */
export function startDeliveryWorker(options: DeliveryWorkerOptions): { stop: () => Promise<void> } {
  let stopping = false;
  let active: Promise<void> | null = null;
  let closed = false;
  const report = (code: 'worker_delivered' | 'worker_retry' | 'worker_failed'): void => {
    try { options.diagnostic?.(code); } catch { /* Diagnostics cannot alter leased delivery. */ }
  };
  const heartbeat = (running: boolean): void => {
    try { options.heartbeat?.(running); } catch { report('worker_failed'); }
  };
  const tick = (): void => {
    if (stopping || active) return;
    heartbeat(true);
    active = Promise.resolve().then(async () => {
      try {
        const result = await options.deliver(1);
        if (result.delivered) report('worker_delivered');
        if (result.failed) report('worker_retry');
      } catch { report('worker_failed'); }
      finally { active = null; heartbeat(false); }
    });
  };
  const cancel = (options.schedule ?? ((callback, milliseconds) => {
    const timer = setInterval(callback, milliseconds);
    return () => clearInterval(timer);
  }))(tick, 15000);
  tick();
  return { async stop() {
    stopping = true; cancel();
    await active;
    if (!closed) { closed = true; options.close(); }
  } };
}
