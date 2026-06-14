interface Window {
  start: number;
  count: number;
}

export class FixedWindowLimiter {
  private windows = new Map<string, Window>();

  constructor(
    private windowMs: number,
    private now: () => number = Date.now
  ) {}

  hit(key: string, limit: number): { ok: boolean; remaining: number } {
    const t = this.now();
    const w = this.windows.get(key);
    if (!w || t - w.start >= this.windowMs) {
      if (this.windows.size > 50_000) this.prune();
      this.windows.set(key, { start: t, count: 1 });
      return { ok: limit >= 1, remaining: Math.max(0, limit - 1) };
    }
    if (w.count >= limit) return { ok: false, remaining: 0 };
    w.count += 1;
    return { ok: true, remaining: limit - w.count };
  }

  prune(): void {
    const t = this.now();
    for (const [k, w] of this.windows) {
      if (t - w.start >= this.windowMs) this.windows.delete(k);
    }
  }
}

export class DailyCounter {
  private counts = new Map<string, number>();
  private day = "";

  constructor(
    private today: () => string = () => new Date().toISOString().slice(0, 10)
  ) {}

  private roll(): void {
    const d = this.today();
    if (d !== this.day) {
      this.day = d;
      this.counts.clear();
    }
  }

  add(key: string, n: number): number {
    this.roll();
    const v = (this.counts.get(key) ?? 0) + n;
    this.counts.set(key, v);
    return v;
  }

  get(key: string): number {
    this.roll();
    return this.counts.get(key) ?? 0;
  }
}

export const rpmLimiter = new FixedWindowLimiter(60_000);
export const rpdLimiter = new FixedWindowLimiter(86_400_000);
export const dailyTokens = new DailyCounter();
