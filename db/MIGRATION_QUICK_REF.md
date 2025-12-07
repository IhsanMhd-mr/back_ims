# Stock Schema Migration - Quick Reference

## TL;DR

**What:** Migrate `stock_records` from single-product schema to unified material+product schema  
**When:** 2025-12-06  
**How Long:** ~1 minute  
**Risk:** Low (backup first!)

## Quick Start

```bash
# 1. Backup
pg_dump -U postgres ims_db > backup_$(date +%s).sql

# 2. Migrate
cd backend/db
node run-stock-migration.js up

# 3. Verify
node run-stock-migration.js status

# 4. Test application
npm run dev  # frontend
npm start    # backend
```

## Schema at a Glance

| Column | Before | After | Type |
|--------|--------|-------|------|
| `product_id` | ✓ PK | Deprecated | INT |
| `product_sku` | ✓ | Deprecated | VARCHAR |
| `item_type` | ✗ | ✓ New | VARCHAR (product\|material) |
| `fk_id` | ✗ | ✓ New | INT NOT NULL |
| `sku` | ✗ | ✓ New | VARCHAR NOT NULL |
| `variant_id` | ✓ | ✓ | VARCHAR |

## Command Reference

```bash
# Apply migration
node run-stock-migration.js up

# Rollback migration
node run-stock-migration.js down

# Check status
node run-stock-migration.js status

# Manual SQL (if needed)
psql -U postgres -d ims_db -f migrations/20251206-update-stock-schema.sql
```

## API Query Updates

### Old Queries
```
/stock/getAll?product_id=18&product_sku=SKU-ABC
```

### New Queries
```
/stock/getAll?fk_id=18&sku=SKU-ABC&item_type=product
/stock/getAll?item_type=material
/stock/getAll?sku=SKU-ABC&item_type=product
```

## Files Created

- `backend/db/migrations/20251206-update-stock-schema.sql` - Forward migration
- `backend/db/migrations/20251206-rollback-stock-schema.sql` - Rollback SQL
- `backend/db/run-stock-migration.js` - Node.js migration runner
- `backend/db/MIGRATION_GUIDE.md` - Full documentation

## Troubleshooting

**Already migrated?**
```bash
node run-stock-migration.js status
```

**Need to rollback?**
```bash
node run-stock-migration.js down
```

**Something wrong?**
```bash
# Restore from backup
psql -U postgres -d ims_db < backup_TIMESTAMP.sql
```

## Verification Queries

```sql
-- Check new columns
SELECT COUNT(*) FROM stock_records WHERE item_type IS NOT NULL;

-- View distribution
SELECT item_type, COUNT(*) FROM stock_records GROUP BY item_type;

-- Check for issues
SELECT COUNT(*) as problems FROM stock_records 
WHERE item_type IS NULL OR fk_id IS NULL OR sku IS NULL;
```

## Next Steps

1. ✅ Run migration
2. ✅ Verify data
3. ✅ Test application
4. ✅ Update documentation
5. ⏭️ (Optional) Drop old columns after 1 week confirmation

---

**Status:** Ready to apply  
**Last Updated:** 2025-12-06  
**Created By:** AI Assistant
