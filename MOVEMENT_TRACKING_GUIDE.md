# Stock Movement Tracking - Implementation Guide

## 📋 Overview

The Stock model now tracks **movement type** (`in`/`out`) and **source** (reason for movement) for complete inventory audit trails.

---

## 🏗️ Database Schema Updates

### New Fields in `stock_records` Table

```sql
-- Added to Stock model:
movement_type VARCHAR(10) NOT NULL DEFAULT 'in'
  -- Constraint: IN ('in', 'out')
  -- Tracks direction of movement: incoming or outgoing stock

source VARCHAR(50) NOT NULL DEFAULT 'adjustment'
  -- Constraint: IN ('purchase', 'sales', 'adjustment', 'return', 'opening_stock')
  -- Identifies reason/source of the movement
```

---

## 📊 Movement Type & Source Reference

### Movement Types
| Value | Meaning | Example |
|-------|---------|---------|
| `in` | Stock incoming | Purchase order, Returns, Opening stock |
| `out` | Stock outgoing | Sales, Consumption, Adjustment |

### Source Types
| Source | Type | Meaning |
|--------|------|---------|
| `purchase` | IN | Purchased from supplier/vendor |
| `sales` | OUT | Sold to customer |
| `adjustment` | IN/OUT | Manual inventory adjustment |
| `return` | IN | Returned from customer/damaged stock return |
| `opening_stock` | IN | Initial stock count at system start |

---

## 🔌 API Usage Examples

### 1️⃣ Create Stock with Movement Info

```http
POST /stock/add
Content-Type: application/json

{
  "item_type": "material",
  "fk_id": 5,
  "sku": "MAT-001",
  "variant_id": "MAT-001",
  "qty": 100,
  "cost": 50.00,
  "date": "2025-12-06",
  "movement_type": "in",
  "source": "purchase",
  "description": "Purchase from supplier ABC",
  "createdBy": 1
}

# Response:
{
  "success": true,
  "data": {
    "id": 45,
    "item_type": "material",
    "fk_id": 5,
    "sku": "MAT-001",
    "variant_id": "MAT-001",
    "qty": 100,
    "cost": "50.00",
    "date": "2025-12-06",
    "movement_type": "in",
    "source": "purchase",
    "description": "Purchase from supplier ABC",
    "status": "active",
    "createdBy": 1,
    "createdAt": "2025-12-06T10:30:00Z",
    "updatedAt": "2025-12-06T10:30:00Z"
  }
}
```

### 2️⃣ Bulk Create with Movement Info

```http
POST /stock/bulk
Content-Type: application/json

{
  "type": "GRN",
  "supplier": "ABC Supplies",
  "grn_date": "2025-12-06",
  "movement_type": "in",
  "source": "purchase",
  "items": [
    {
      "item_type": "material",
      "sku": "MAT-001",
      "variant_id": "MAT-001",
      "fk_id": 5,
      "qty": 100,
      "cost": 50.00,
      "batch_number": "BATCH-2025-001"
    },
    {
      "item_type": "material",
      "sku": "MAT-002",
      "variant_id": "MAT-002",
      "fk_id": 6,
      "qty": 50,
      "cost": 75.00,
      "batch_number": "BATCH-2025-001"
    }
  ]
}
```

### 3️⃣ Filter Stock by Movement Type

```http
# Get all incoming stock
GET /stock/getAll?movement_type=in&page=1&limit=20

# Get all outgoing stock
GET /stock/getAll?movement_type=out&page=1&limit=20

# Get all purchase orders
GET /stock/movements?movement_type=in&source=purchase&page=1&limit=20

# Get all sales transactions
GET /stock/movements?movement_type=out&source=sales&page=1&limit=20

# Get all returns
GET /stock/movements?movement_type=in&source=return&page=1&limit=20

# Get all adjustments
GET /stock/movements?source=adjustment&page=1&limit=20
```

### 4️⃣ Manual Stock Adjustment

```http
POST /stock/adjust
Content-Type: application/json

{
  "product_id": 5,
  "qty": 25,
  "note": "Inventory correction - damaged units removed",
  "movement_type": "out",
  "source": "adjustment",
  "approver_id": 1,
  "createdBy": 2
}
```

### 5️⃣ Sell Products (Auto OUT/sales)

```http
POST /stock/sell
Content-Type: application/json

{
  "items": [
    {
      "variant_id": "PRD-001",
      "qty": 5
    },
    {
      "variant_id": "PRD-002",
      "qty": 3
    }
  ],
  "createdBy": 1
}

# Automatically creates:
# - movement_type: 'out'
# - source: 'sales'
```

### 6️⃣ Convert Materials to Products (Auto IN/adjustment)

```http
POST /stock/convert
Content-Type: application/json

{
  "materials": [
    { "variant_id": "MAT-001", "qty": 10 },
    { "variant_id": "MAT-002", "qty": 5 }
  ],
  "product_variant": "PRD-ASSEMBLED-001",
  "produced_qty": 8,
  "createdBy": 1
}

# Automatically creates:
# Materials: movement_type: 'out', source: 'adjustment'
# Products: movement_type: 'in', source: 'adjustment'
```

### 7️⃣ Update Stock with Movement Info

```http
PUT /stock/put/45
Content-Type: application/json

{
  "qty": 95,
  "cost": 52.00,
  "movement_type": "in",
  "source": "purchase",
  "updatedBy": 1
}
```

---

## 📈 Report Examples

### Purchase Orders Report
```http
GET /stock/movements?movement_type=in&source=purchase&start_date=2025-12-01&end_date=2025-12-31
```

### Sales Report
```http
GET /stock/movements?movement_type=out&source=sales&start_date=2025-12-01&end_date=2025-12-31
```

### Adjustments Report
```http
GET /stock/movements?source=adjustment&start_date=2025-12-01&end_date=2025-12-31
```

### Stock In/Out Summary
```http
GET /stock/getAll?movement_type=in&page=1&limit=100
GET /stock/getAll?movement_type=out&page=1&limit=100
```

### Returns Processing
```http
GET /stock/movements?movement_type=in&source=return&status=active
```

---

## 🔄 Automatic Movement Assignment

The following operations **automatically** set movement type and source:

### Stock Sell
```javascript
// Automatically sets:
movement_type: 'out',
source: 'sales'
```

### Stock Adjustment
```javascript
// Automatically sets (can be overridden):
movement_type: 'in',      // or 'out' based on context
source: 'adjustment'
```

### Material Conversion
```javascript
// Materials consumed:
movement_type: 'out',
source: 'adjustment'

// Products produced:
movement_type: 'in',
source: 'adjustment'
```

---

## 🗂️ Code Changes Summary

### Stock Model (`src/models/stock.model.js`)
- ✅ Added `movement_type` field with validation
- ✅ Added `source` field with validation
- ✅ Both fields have sensible defaults

### Stock Repository (`src/repositories/stock.repository.js`)
- ✅ Updated `updateStock()` to include new fields in `allowedFields`
- ✅ Updated `adjustStock()` to accept and pass `movement_type` and `source`
- ✅ Updated `convertMaterialsToProducts()` to set automatic values
- ✅ Updated `sellProducts()` to auto-set OUT/sales

### Stock Controller (`src/controllers/stock.controller.js`)
- ✅ Updated `bulkCreate()` to handle new fields
- ✅ Updated `getAll()` to filter by `movement_type` and `source`
- ✅ Updated `getByPeriod()` to filter by new fields
- ✅ Query parameter support: `?movement_type=in&source=purchase`

### Stock Routes (`src/routes/stock.router.js`)
- ✅ Added `/movements` endpoint for filtered queries
- ✅ All existing endpoints support movement filters

---

## 📊 Query Examples

### Dashboard - Today's Movements
```javascript
// Incoming today
GET /stock/period?period=today&movement_type=in

// Outgoing today
GET /stock/period?period=today&movement_type=out
```

### Analytics - Monthly Breakdown
```javascript
// Purchases this month
GET /stock/getAll?month=12&year=2025&movement_type=in&source=purchase

// Sales this month
GET /stock/getAll?month=12&year=2025&movement_type=out&source=sales

// All adjustments
GET /stock/getAll?month=12&year=2025&source=adjustment
```

### Audit Trail - Complete History
```javascript
// All movements for a product
GET /stock/getAll?fk_id=5&page=1&limit=100

// All movements for a SKU
GET /stock/getAll?sku=MAT-001&page=1&limit=100

// All movements for variant
GET /stock/getAll?variant_id=MAT-001&page=1&limit=100
```

---

## ✅ Backwards Compatibility

- Existing API calls work without changes (defaults applied)
- Old stock records retain defaults (`movement_type: 'in'`, `source: 'adjustment'`)
- New fields are optional in update operations
- Filtering by these fields is completely optional

---

## 🚀 Next Steps

1. ✅ Model updated with new fields
2. ✅ Repository & Controller updated
3. ✅ Routes configured
4. Test all endpoints with Postman
5. Update frontend to capture movement context
6. Generate reports using filters

---

## 📝 Notes

- Migration required to add columns to existing `stock_records` table if upgrading
- All constraints are enforced at database and application level
- Complete audit trail via `createdBy`, `updatedBy`, `deletedBy` fields
- Soft-delete compatible (paranoid: true)
