// Simple pluggable cache layer with two engines: in-memory and Redis (ioredis)
// Toggle engines by changing the `USE_REDIS` flag below to `true` or `false`.
// For Redis, set `process.env.REDIS_URL` (Render provides this) and optionally
// set `process.env.USE_REDIS = 'true'` to enable Redis at runtime.

import dotenv from 'dotenv';
dotenv.config();

// Single boolean flag to switch engines. For now we force in-memory to avoid
// accidental Redis usage during development/testing. To enable Redis later,
// change this line to `const USE_REDIS = process.env.USE_REDIS === 'true'` or
// set the environment variable `USE_REDIS='true'` and restart the server.
const USE_REDIS = false; // <-- using in-memory cache only for now

// Default TTL used by example controllers when not specified
export const DEFAULT_CACHE_TTL = 60; // seconds

// ------------------ In-memory cache engine ------------------
const memoryStore = new Map();
// tagMap: tag -> Set of keys
const memoryTagMap = new Map();

const memoryCache = {
  async get(key) {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    const { value, expiresAt } = entry;
    if (expiresAt && Date.now() > expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    try {
      return JSON.parse(value);
    } catch (e) {
      // If parsing fails, return raw value
      return value;
    }
  },

  async set(key, value, ttlInSeconds = DEFAULT_CACHE_TTL) {
    const str = JSON.stringify(value);
    const expiresAt = ttlInSeconds ? Date.now() + ttlInSeconds * 1000 : null;
    memoryStore.set(key, { value: str, expiresAt });
    return true;
  },

  // set with tags: records the key under provided tags for easier invalidation
  async setWithTags(key, value, ttlInSeconds = DEFAULT_CACHE_TTL, tags = []) {
    await this.set(key, value, ttlInSeconds);
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        let s = memoryTagMap.get(tag);
        if (!s) {
          s = new Set();
          memoryTagMap.set(tag, s);
        }
        s.add(key);
      }
    }
    return true;
  },

  async invalidateTag(tag) {
    const s = memoryTagMap.get(tag);
    if (!s) return 0;
    let deleted = 0;
    for (const key of s) {
      if (memoryStore.delete(key)) deleted++;
    }
    memoryTagMap.delete(tag);
    return deleted;
  },

  async invalidateTags(tags = []) {
    if (!Array.isArray(tags)) tags = [tags];
    let total = 0;
    for (const t of tags) {
      total += await this.invalidateTag(t);
    }
    return total;
  },

  async delete(key) {
    return memoryStore.delete(key);
  }
};

// ------------------ Redis cache engine (ioredis) ------------------
let redisCache = null;
if (USE_REDIS) {
  try {
    // Lazy-import ioredis to keep local development lightweight when not used
    const Redis = (await import('ioredis')).default;
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('USE_REDIS is true but REDIS_URL is not set. Falling back to memory cache.');
      redisCache = memoryCache;
    } else {
      const client = new Redis(redisUrl, {
        // Recommended options can be adjusted for Render Redis
        lazyConnect: false,
        maxRetriesPerRequest: 1,
      });

      client.on('error', (err) => console.error('Redis client error', err));

      redisCache = {
        async get(key) {
          const raw = await client.get(key);
          if (raw == null) return null;
          try {
            return JSON.parse(raw);
          } catch (e) {
            return raw;
          }
        },

        async set(key, value, ttlInSeconds = DEFAULT_CACHE_TTL) {
          const str = JSON.stringify(value);
          if (ttlInSeconds && Number(ttlInSeconds) > 0) {
            await client.set(key, str, 'EX', Number(ttlInSeconds));
          } else {
            await client.set(key, str);
          }
          return true;
        },

        // set value and record key under provided tags (tag sets named `tag:{tag}`)
        async setWithTags(key, value, ttlInSeconds = DEFAULT_CACHE_TTL, tags = []) {
          await this.set(key, value, ttlInSeconds);
          if (Array.isArray(tags) && tags.length > 0) {
            const tagKeys = tags.map(t => `tag:${t}`);
            // Add key to each tag set
            for (const t of tagKeys) {
              await client.sadd(t, key);
            }
          }
          return true;
        },

        async invalidateTag(tag) {
          const setKey = `tag:${tag}`;
          const members = await client.smembers(setKey);
          if (!members || members.length === 0) {
            await client.del(setKey);
            return 0;
          }
          const pipeline = client.pipeline();
          for (const k of members) pipeline.del(k);
          pipeline.del(setKey);
          await pipeline.exec();
          return members.length;
        },

        async invalidateTags(tags = []) {
          if (!Array.isArray(tags)) tags = [tags];
          let total = 0;
          for (const t of tags) {
            total += await this.invalidateTag(t);
          }
          return total;
        },

        async delete(key) {
          return client.del(key);
        },

        // Expose the raw client if needed (careful with usage)
        _client: client
      };
    }
  } catch (err) {
    console.error('Failed to initialize Redis cache, falling back to memory cache.', err);
    redisCache = memoryCache;
  }
}

// Final exported cache instance
export const cache = USE_REDIS ? (redisCache || memoryCache) : memoryCache;

// Convenience exports
export const memory = memoryCache;
export const redis = redisCache;

export default cache;
