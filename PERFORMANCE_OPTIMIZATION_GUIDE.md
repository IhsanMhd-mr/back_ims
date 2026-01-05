# Database Performance Optimization Guide

## Problem Description
Bills API experiencing severe performance issues:
- Status updates taking 10-30 seconds
- GET requests (getAll, getById) extremely slow
- Frontend experiencing timeouts and poor UX

## Root Causes Identified

### 1. **Missing Database Indexes** ❌
- No indexes on foreign keys (bill_id, product_id)
- No indexes on frequently queried columns (status, date, customer_name)
- No indexes on deleted_at for paranoid queries
- Result: Full table scans on every query

### 2. **N+1 Query Problem** ❌
- `getAll()` wasn't including items, causing separate queries for each bill
- Frontend making duplicate API calls without rate limiting

### 3. **Suboptimal Query Patterns** ❌
- Missing eager loading of associations
- No query optimization for pagination with includes

### 4. **Poor Connection Pool Settings** ❌
- Only 5 max connections, 0 min connections
- Pool exhaustion under load

## Solutions Implemented

### ✅ 1. Database Indexes (CRITICAL)

**Run this migration immediately:**
```bash
cd backend
node db/run-performance-migration.js
```

**Indexes added:**
- `idx_bills_status` - For status filtering
- `idx_bills_date` - For date sorting
- `idx_bills_created_at` - For default sorting
- `idx_bills_status_date` - Composite for status + date queries
- `idx_item_sales_bill_id` - **CRITICAL** for JOIN performance
- `idx_item_sales_product_id` - For product lookups
- Plus many more (see migration file)

**Expected improvement:** 10-100x faster queries

### ✅ 2. Repository Optimization

**Before:**
```javascript
getAll: async ({ page = 1, limit = 50 } = {}) => {
  const { rows: data, count: total } = await Bill.findAndCountAll({ 
    limit, 
    offset, 
    order: [['createdAt', 'DESC']] 
  });
  // Items NOT included - causes N+1 queries
}
```

**After:**
```javascript
getAll: async ({ page = 1, limit = 50 } = {}) => {
  const { rows: data, count: total } = await Bill.findAndCountAll({ 
    limit, 
    offset, 
    order: [['createdAt', 'DESC']],
    include: [{ 
      model: ItemSale, 
      as: 'items',
      attributes: ['id', 'product_id', 'product_name', 'sku', 'variant_id', 'quantity', 'unit_price', 'subtotal', 'discount_percent']
    }],
    subQuery: false,  // Optimize COUNT with includes
    distinct: true
  });
}
```

**Expected improvement:** Eliminates N+1 queries, single query instead of N+1

### ✅ 3. Connection Pool Optimization

**Before:**
```javascript
pool: {
  max: 5,
  min: 0,
  acquire: 30000,
  idle: 10000
}
```

**After:**
```javascript
pool: {
  max: 10,  // Doubled
  min: 2,   // Keep connections alive
  acquire: 30000,
  idle: 10000
}
```

### ✅ 4. Query Logging & Monitoring

Added smart query logging:
- Logs slow queries (>500ms) in all environments
- Color-coded by performance (green/yellow/red)
- Benchmark timing enabled
- Enable full SQL logging: `LOG_SQL=true node server.js`

### ✅ 5. Frontend Rate Limiting

Removed rate limiting from intentional sequential API calls:
```javascript
// Direct methods (no artificial delays)
billService.getById(id)
billService.statusHandle(id, status)
```

**Expected improvement:** Removed 600ms+ artificial delays

## Performance Testing & Diagnostics

### Run Performance Diagnostics
```bash
cd backend
node db/diagnose-performance.js
```

This will show:
- Table sizes and row counts
- Index usage statistics
- Missing indexes
- Slow queries (if pg_stat_statements enabled)
- Connection pool status
- Active locks
- Performance recommendations

### Enable Query Statistics (Optional)
```sql
-- Run in PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slowest queries
SELECT 
  LEFT(query, 100) as query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Monitor Real-Time Performance
```bash
# Enable SQL logging
LOG_SQL=true npm start

# Watch for slow queries (>500ms)
# They'll appear in red in the console
```

## Expected Results

### Before Optimization
- Bill status update: **10-30 seconds**
- Bill getAll: **5-15 seconds**
- Bill getById: **2-5 seconds**

### After Optimization
- Bill status update: **100-500ms** (20-300x faster)
- Bill getAll: **200-800ms** (10-50x faster)
- Bill getById: **50-200ms** (20-50x faster)

## Verification Steps

1. **Run the migration:**
   ```bash
   node db/run-performance-migration.js
   ```

2. **Run diagnostics:**
   ```bash
   node db/diagnose-performance.js
   ```

3. **Test the API:**
   ```bash
   # Test status update
   curl -X PATCH http://localhost:3000/bills/status_handle/1/COMPLETED

   # Test getById
   curl http://localhost:3000/bills/get/1

   # Test getAll
   curl http://localhost:3000/bills/getAll?page=1&limit=50
   ```

4. **Check logs for slow queries:**
   - Any query >500ms will be logged in yellow/red
   - Any query >1000ms will show warning

## Maintenance Recommendations

### Daily
- Monitor slow query logs
- Check for errors in application logs

### Weekly
- Run diagnostics: `node db/diagnose-performance.js`
- Check index usage statistics

### Monthly
- Run `VACUUM ANALYZE bills; VACUUM ANALYZE item_sales;`
- Review and optimize unused indexes
- Archive old bills (older than 1 year)

### Quarterly
- Review query patterns and add new indexes as needed
- Consider partitioning if bills > 100,000

## Additional Optimizations (Future)

1. **Caching Layer**
   - Add Redis for frequently accessed bills
   - Cache bill counts and statistics

2. **Database Partitioning**
   - Partition bills by date (monthly/quarterly)
   - Archive old data

3. **Read Replicas**
   - Separate read/write operations
   - Use replica for GET requests

4. **Query Optimization**
   - Add full-text search indexes if searching bill content
   - Optimize JOIN queries with covering indexes

## Troubleshooting

### Still Seeing Slow Queries?

1. **Check if migration ran:**
   ```sql
   SELECT tablename, indexname FROM pg_indexes 
   WHERE tablename IN ('bills', 'item_sales');
   ```

2. **Check index usage:**
   ```sql
   SELECT * FROM pg_stat_user_indexes 
   WHERE tablename = 'bills';
   ```

3. **Check for locks:**
   ```sql
   SELECT * FROM pg_locks 
   JOIN pg_class ON pg_locks.relation = pg_class.oid;
   ```

4. **Run EXPLAIN ANALYZE:**
   ```sql
   EXPLAIN ANALYZE 
   SELECT * FROM bills WHERE status = 'PENDING' ORDER BY created_at DESC LIMIT 50;
   ```

### Query Not Using Index?

- Run `ANALYZE bills;` to update statistics
- Check query pattern matches index
- Ensure WHERE clause uses indexed columns
- Avoid functions on indexed columns (use functional indexes)

## Contact & Support

If performance issues persist:
1. Run diagnostics and save output
2. Enable SQL logging: `LOG_SQL=true`
3. Capture slow query examples
4. Check PostgreSQL logs
5. Review connection pool metrics

---

**Last Updated:** January 2, 2026
**Version:** 1.0.0
