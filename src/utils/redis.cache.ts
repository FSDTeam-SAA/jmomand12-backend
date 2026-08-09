import Redis from 'ioredis';
import config from '../config';
import logger from '../logger';

let redisClient: Redis | null = null;

export interface CacheEntry<T> {
  value: T;
  softExpireAt: number;
}

const getRedisClient = (): Redis | null => {
  if (!config.redis?.url) return null;
  if (!redisClient) {
    try {
      redisClient = new Redis(config.redis.url, {
        maxRetriesPerRequest: 2,
        lazyConnect: false,
        enableOfflineQueue: false,
      });

      redisClient.on('error', (err) => {
        logger.warn({ error: err.message }, 'Redis cache client error');
      });
    } catch (error: any) {
      logger.warn({ error: error.message }, 'Failed to initialize Redis cache client');
      redisClient = null;
    }
  }
  return redisClient;
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const client = getRedisClient();
    if (!client || client.status !== 'ready') return null;
    const data = await client.get(key);
    if (!data) return null;

    const entry: CacheEntry<T> = JSON.parse(data);
    // If structured cache entry with soft expiration
    if (entry && typeof entry === 'object' && 'softExpireAt' in entry && 'value' in entry) {
      return entry.value;
    }
    return entry as unknown as T;
  } catch {
    return null;
  }
};

export const setCache = async (key: string, data: any, ttlSeconds: number = 5): Promise<void> => {
  try {
    const client = getRedisClient();
    if (!client || client.status !== 'ready') return;

    // Add random 0-20% TTL jitter to prevent simultaneous mass expiration
    const jitterMs = Math.floor(Math.random() * (ttlSeconds * 0.2 * 1000));
    const softExpireAt = Date.now() + ttlSeconds * 1000 + jitterMs;
    const hardTtlMs = ttlSeconds * 2 * 1000 + jitterMs; // Keep stale copy in Redis 2x for soft expiry

    const entry: CacheEntry<any> = {
      value: data,
      softExpireAt,
    };

    await client.set(key, JSON.stringify(entry), 'PX', hardTtlMs);
  } catch (error: any) {
    logger.warn({ error: error.message, key }, 'Failed to set Redis cache');
  }
};

/**
 * Cache Stampede Protected Fetcher (Stale-While-Revalidate + Single-Flight Mutex)
 */
export const getOrFetchWithCache = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 5,
): Promise<T> => {
  const client = getRedisClient();
  if (!client || client.status !== 'ready') {
    return await fetcher();
  }

  const lockKey = `cache:lock:${key}`;

  try {
    const cachedString = await client.get(key);

    if (cachedString) {
      const entry: CacheEntry<T> = JSON.parse(cachedString);
      const now = Date.now();

      // 1. Fresh Cache Hit: Return value instantly
      if (entry && typeof entry === 'object' && 'softExpireAt' in entry && now < entry.softExpireAt) {
        return entry.value;
      }

      // 2. Soft-Expired Cache Hit: Return stale value immediately, refresh in background via lock
      if (entry && typeof entry === 'object' && 'value' in entry) {
        client.set(lockKey, '1', 'PX', 5000, 'NX').then((acquired) => {
          if (acquired === 'OK') {
            fetcher()
              .then((freshData) => setCache(key, freshData, ttlSeconds))
              .catch((err) => logger.warn({ error: err.message, key }, 'Background cache refresh failed'))
              .finally(() => {
                client.del(lockKey).catch(() => {});
              });
          }
        }).catch(() => {});

        return entry.value;
      }
    }
  } catch (error: any) {
    logger.warn({ error: error.message, key }, 'Redis cache read exception; executing fetcher directly');
  }

  // 3. Hard Cache Miss: Acquire single-flight Mutex Lock to recompute
  let acquiredLock: string | null = null;
  try {
    acquiredLock = await client.set(lockKey, '1', 'PX', 5000, 'NX');
  } catch {
    acquiredLock = null;
  }

  if (acquiredLock === 'OK') {
    try {
      const freshData = await fetcher();
      await setCache(key, freshData, ttlSeconds);
      return freshData;
    } finally {
      await client.del(lockKey).catch(() => {});
    }
  }

  // 4. Another concurrent request is updating cache: wait up to 250ms for lock holder to write cache
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      const retryCached = await client.get(key);
      if (retryCached) {
        const entry: CacheEntry<T> = JSON.parse(retryCached);
        if (entry && typeof entry === 'object' && 'value' in entry) {
          return entry.value;
        }
      }
    } catch {
      break;
    }
  }

  // 5. Fallback: Fetch directly from database if lock waiter timed out
  return await fetcher();
};

/**
 * Non-blocking SCAN-based cache invalidation for production safety
 */
export const invalidateCachePattern = async (pattern: string): Promise<void> => {
  try {
    const client = getRedisClient();
    if (!client || client.status !== 'ready') return;

    const stream = client.scanStream({
      match: pattern,
      count: 100,
    });

    const keysToDelete: string[] = [];

    stream.on('data', (resultKeys: string[]) => {
      keysToDelete.push(...resultKeys);
    });

    stream.on('end', async () => {
      if (keysToDelete.length > 0) {
        for (let i = 0; i < keysToDelete.length; i += 500) {
          const chunk = keysToDelete.slice(i, i + 500);
          await client.del(...chunk).catch(() => {});
        }
      }
    });
  } catch (error: any) {
    logger.warn({ error: error.message, pattern }, 'Failed to invalidate cache pattern');
  }
};
