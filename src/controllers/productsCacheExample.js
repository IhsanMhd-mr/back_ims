// Example controller demonstrating use of the cache layer
// Adjust DB query to match your project's data access layer.

import sequelize from '../config/db.js';
import { cache, DEFAULT_CACHE_TTL } from '../utils/cache.js';

export const getProducts = async (req, res) => {
  try {
    const cacheKey = 'products:all';

    // 1) Check cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, fromCache: true, data: cached });
    }

    // 2) Query DB (adjust table/columns to your schema)
    // Using Sequelize raw query here as a simple example
    const [products] = await sequelize.query('SELECT * FROM products ORDER BY id ASC');

    // 3) Store result in cache with TTL and tag for easier invalidation
    // Tag name 'products' will be used by create/update/delete operations to invalidate
    await (cache.setWithTags ? cache.setWithTags(cacheKey, products, DEFAULT_CACHE_TTL, ['products']) : cache.set(cacheKey, products, DEFAULT_CACHE_TTL));

    // 4) Return fresh data
    return res.json({ success: true, fromCache: false, data: products });
  } catch (err) {
    console.error('getProducts error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Example create product controller showing cache invalidation
export const createProduct = async (req, res) => {
  try {
    const { name, sku, price } = req.body;
    // Simple insert example - adapt to your models
    const [result] = await sequelize.query(`INSERT INTO products (name, sku, price) VALUES (${sequelize.escape(name)}, ${sequelize.escape(sku)}, ${sequelize.escape(price)}) RETURNING *`);

    // Invalidate product-related caches
    if (cache.invalidateTag) {
      await cache.invalidateTag('products');
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('createProduct error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
