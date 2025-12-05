# Stock Schema Migration Guide

## Overview
This migration updates the `stock_records` table schema to support a unified inventory system for both materials and products.

**Migration Date:** 2025-12-06  
**Database:** PostgreSQL  
**Direction:** product_id/product_sku → item_type/fk_id/sku

---

## Schema Changes

### Before Migration
```sql
CREATE TABLE stock_records (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,          -- Foreign key to Product
  product_sku VARCHAR(255) NOT NULL,    -- Product SKU reference
  variant_id VARCHAR(255),              -- Variant identifier
  batch_number VARCHAR(255),
  description TEXT,
  cost DECIMAL(12,2) DEFAULT 0,
  date DATE,
  qty FLOAT DEFAULT 0,
  unit VARCHAR(255),
  tags VARCHAR(255),
  approver_id INTEGER,
  status VARCHAR(255) DEFAULT 'active',
  createdBy INTEGER,
  updatedBy INTEGER,
  deletedBy INTEGER,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP
);
```

### After Migration
```sql
CREATE TABLE stock_records (
  id SERIAL PRIMARY KEY,
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('material', 'product')),
  fk_id INTEGER NOT NULL,               -- Foreign key to Product or Material
  sku VARCHAR(255) NOT NULL,            -- SKU reference
  variant_id VARCHAR(255),              -- Variant identifier
  batch_number VARCHAR(255),
  description TEXT,
  cost DECIMAL(12,2) DEFAULT 0,
  date DATE,
  qty FLOAT DEFAULT 0,
  unit VARCHAR(255),
  tags VARCHAR(255),
  approver_id INTEGER,
  status VARCHAR(255) DEFAULT 'active',
  createdBy INTEGER,
  updatedBy INTEGER,
  deletedBy INTEGER,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP
  -- Old columns product_id, product_sku kept for backward compatibility
);
```

### Key Changes
| Old | New | Type | Reason |
|-----|-----|------|--------|
| `product_id` | `fk_id` | INT NOT NULL | Generic FK to Product or Material |
| `product_sku` | `sku` | VARCHAR NOT NULL | Generic SKU reference |
| N/A | `item_type` | VARCHAR NOT NULL | Identifies if record is 'product' or 'material' |

---

## Migration Steps

### Step 1: Backup Database
```bash
# Create backup before applying migration
pg_dump -U postgres ims_db > ims_db_backup_20251206.sql
```

### Step 2: Apply Migration

#### Option A: Using Migration Script (Recommended)
```bash
cd backend/db
node run-stock-migration.js up
```

#### Option B: Direct SQL
```bash
psql -U postgres -d ims_db -f migrations/20251206-update-stock-schema.sql
```

### Step 3: Verify Migration
```bash
# Check new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stock_records' 
AND column_name IN ('item_type', 'fk_id', 'sku')
ORDER BY column_name;

# Verify data migration
SELECT item_type, COUNT(*) as count FROM stock_records GROUP BY item_type;

# Check for NULL values
SELECT COUNT(*) as nulls FROM stock_records WHERE item_type IS NULL OR fk_id IS NULL OR sku IS NULL;
```

### Step 4: Update Application Code
- ✅ Backend: Use new `item_type`, `fk_id`, `sku` fields
- ✅ Frontend: Use new query parameters (`item_type`, `fk_id`, `sku`)
- ✅ Models: Sequelize model already updated

### Step 5: Clean Up Old Columns (Optional)
After verifying the new schema works correctly:
```bash
# Drop old columns
ALTER TABLE stock_records DROP COLUMN product_id;
ALTER TABLE stock_records DROP COLUMN product_sku;
```

---

## Data Migration Details

### Automatic Data Migration
The migration script automatically:
1. Copies `product_id` → `fk_id`
2. Copies `product_sku` → `sku`
3. Sets `item_type = 'product'` for all existing records
4. Sets all as NOT NULL

### Example Data Transformation
```
Before:
| id | product_id | product_sku |
|----|------------|-------------|
| 1  | 18         | SKU-ABC     |
| 2  | 25         | SKU-XYZ     |

After:
| id | item_type | fk_id | sku     |
|----|-----------|-------|---------|
| 1  | product   | 18    | SKU-ABC |
| 2  | product   | 25    | SKU-XYZ |
```

---

## Rollback Instructions

If migration needs to be rolled back:

### Option A: Using Migration Script
```bash
node run-stock-migration.js down
```

### Option B: Direct SQL
```bash
psql -U postgres -d ims_db -f migrations/20251206-rollback-stock-schema.sql
```

### Option C: From Backup
```bash
# Restore from backup
psql -U postgres -d ims_db < ims_db_backup_20251206.sql
```

---

## API Endpoint Updates

### Before
```
GET /stock/getAll?product_id=18&product_sku=SKU-ABC
```

### After
```
GET /stock/getAll?fk_id=18&sku=SKU-ABC&item_type=product
```

### Filter Examples
```
# Get all products
GET /stock/getAll?item_type=product

# Get all materials
GET /stock/getAll?item_type=material

# Get specific SKU
GET /stock/getAll?sku=SKU-ABC

# Get by FK ID
GET /stock/getAll?fk_id=18

# Combined filters
GET /stock/getAll?item_type=product&sku=SKU-ABC&status=active
```

---

## Backward Compatibility

### During Migration
- Old columns `product_id`, `product_sku` are kept but deprecated
- New columns `item_type`, `fk_id`, `sku` are populated from old data
- Both old and new queries will work temporarily

### After Migration (If old columns removed)
- Only new schema is available
- Update all queries and code to use new fields
- GRN system will use `item_type: 'product'` by default

---

## Testing Checklist

- [ ] Database backup created
- [ ] Migration script executed successfully
- [ ] All new columns exist with correct data types
- [ ] Data migrated correctly (no NULLs)
- [ ] CHECK constraint for `item_type` working
- [ ] Stock API endpoints respond with new fields
- [ ] Frontend Stock page displays data correctly
- [ ] GRN form creates records with `item_type='product'`
- [ ] Filtering by `item_type` works
- [ ] Historical records accessible
- [ ] No errors in application logs

---

## Performance Impact

- **Migration Duration:** ~5-30 seconds (depending on record count)
- **Downtime:** ~1-2 seconds during constraint addition
- **Storage:** Minimal increase (3 new columns, old ones kept)

---

## Support & Troubleshooting

### Common Issues

**Issue: "Column already exists"**
- Migration previously attempted
- Safe to run again (checks for existing columns)

**Issue: NULL values in new columns**
- Check if old data has NULLs
- Verify UPDATE queries executed successfully
- Manual cleanup may be needed

**Issue: CHECK constraint violation**
- Ensure `item_type` only contains 'material' or 'product'
- Update records with invalid values

---

## References

- **Migration Files:**
  - `backend/db/migrations/20251206-update-stock-schema.sql` - Forward migration
  - `backend/db/migrations/20251206-rollback-stock-schema.sql` - Rollback
  - `backend/db/run-stock-migration.js` - Migration runner script

- **Model Updates:**
  - `backend/src/models/stock.model.js` - Updated Sequelize model

- **Controller Updates:**
  - `backend/src/controllers/stock.controller.js` - Updated filter handling

- **Frontend Updates:**
  - `frontend/src/pages/Stock.jsx` - Updated table display and filters
