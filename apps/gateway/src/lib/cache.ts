// In-process TTL cache. Replaces the previous Upstash Redis "cache", which
// cost a network round trip per lookup — often slower than the DB query it was
// guarding. Single-process scope is fine for a self-hosted deployment; run one
// gateway instance (or accept an independent cache per instance).
export class TTLCache<T> {
  private store = new Map<string, { value: T; expires: number }>();

  constructor(
    private ttlMs: number,
    private maxEntries = 10_000,
    private now: () => number = Date.now
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.now() >= entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.maxEntries) this.prune();
    this.store.set(key, { value, expires: this.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  prune(): void {
    const t = this.now();
    for (const [k, v] of this.store) {
      if (t >= v.expires) this.store.delete(k);
    }
    // Still over the cap after dropping expired entries (a hot flood of unique
    // keys): drop oldest-inserted to bound memory.
    if (this.store.size >= this.maxEntries) {
      const overflow = this.store.size - Math.floor(this.maxEntries / 2);
      let i = 0;
      for (const k of this.store.keys()) {
        if (i++ >= overflow) break;
        this.store.delete(k);
      }
    }
  }

  get size(): number {
    return this.store.size;
  }
}
