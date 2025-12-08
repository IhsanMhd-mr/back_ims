import { cache, DEFAULT_CACHE_TTL } from '../utils/cache.js';

// Caching middleware for GET requests
// - Caches successful JSON responses (res.json) for GET requests only
// - Key: req.originalUrl (includes path + query)
// - TTL: DEFAULT_CACHE_TTL seconds (can be overridden when setting manually)

export default function cacheMiddleware(req, res, next) {
  // Only cache GET requests
  if (req.method !== 'GET') return next();

  // Allow routes to opt-out or provide explicit cache keys/tags via res.locals
  if (res.locals && res.locals.noCache) return next();

  const key = (res.locals && res.locals.cacheKey) ? res.locals.cacheKey : req.originalUrl;
  const ttl = (res.locals && res.locals.cacheTTL) ? res.locals.cacheTTL : DEFAULT_CACHE_TTL;
  const tags = (res.locals && res.locals.cacheTags) ? res.locals.cacheTags : null;

  (async () => {
    try {
      const cached = await cache.get(key);
      if (cached != null) {
        // Send cached response. We assume controllers return an object/array.
        return res.json(typeof cached === 'object' ? cached : cached);
      }
    } catch (err) {
      // If cache read fails, log and continue; do not block request
      console.error('[cacheMiddleware] read error', err);
    }

    // Wrap res.json to capture the response body
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      try {
        // Store the body in cache asynchronously; don't await to avoid delaying response
        if (Array.isArray(tags) && tags.length > 0 && cache.setWithTags) {
          cache.setWithTags(key, body, ttl, tags).catch((e) => console.error('[cacheMiddleware] write error', e));
        } else {
          cache.set(key, body, ttl).catch((e) => console.error('[cacheMiddleware] write error', e));
        }
      } catch (err) {
        console.error('[cacheMiddleware] cache set error', err);
      }
      return originalJson(body);
    };

    return next();
  })();
}
