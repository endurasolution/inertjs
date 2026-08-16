export class RateLimiter {
  constructor(reqPerSec = 100) {
    this.reqPerSec = reqPerSec;
    this.buckets = new Map();
  }

  /**
   * Checks if an IP is allowed to make a request.
   * @param {string} ip 
   * @returns {boolean} True if allowed, false if rate limited.
   */
  check(ip) {
    const now = Date.now();
    const windowStart = Math.floor(now / 1000); // 1-second windows

    let bucket = this.buckets.get(ip);
    if (!bucket || bucket.window !== windowStart) {
      bucket = { window: windowStart, count: 0 };
      this.buckets.set(ip, bucket);
    }

    if (bucket.count >= this.reqPerSec) {
      return false;
    }

    bucket.count++;
    
    // Clean up old buckets periodically (probabilistic)
    if (Math.random() < 0.01) {
      this.cleanup(windowStart);
    }

    return true;
  }

  cleanup(currentWindow) {
    for (const [ip, bucket] of this.buckets.entries()) {
      if (bucket.window < currentWindow) {
        this.buckets.delete(ip);
      }
    }
  }
}
