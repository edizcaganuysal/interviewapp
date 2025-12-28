type BucketKey = string;

const buckets: Map<BucketKey, { count: number; resetAt: number }> = new Map();

export function rateLimit(key: string, opts: { windowMs: number; max: number }) {
  const now = Date.now();
  const existing = buckets.get(key);
  const resetAt = now + opts.windowMs;

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.max - 1, resetAt };
  }

  if (existing.count >= opts.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return { allowed: true, remaining: opts.max - existing.count, resetAt: existing.resetAt };
}
