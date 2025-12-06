# Stock Movement Tracking - Quick Reference

## 📌 API Endpoints Quick Links

### View Movement Data
| Endpoint | Description | Query Params |
|----------|---|---|
| `GET /stock/getAll` | List all stock with filters | movement_type, source, sku, date |
| `GET /stock/movements` | Filtered movement view | movement_type, source, date |
| `GET /stock/period` | Period-based movements | period, movement_type, source |

### Create/Update with Movement
| Endpoint | Description | Movement Fields |
|----------|---|---|
| `POST /stock/add` | Single stock entry | movement_type, source (optional) |
| `POST /stock/bulk` | Bulk stock creation | movement_type, source (optional) |
| `PUT /stock/put/:id` | Update stock | movement_type, source (optional) |
| `POST /stock/adjust` | Manual adjustment | movement_type, source (optional) |

### Auto-Assigned Operations
| Endpoint | Auto Sets | Direction |
|----------|---|---|
| `POST /stock/sell` | movement_type: 'out', source: 'sales' | Outgoing |
| `POST /stock/convert` | (materials) out/adjustment, (products) in/adjustment | Mixed |

---

## 🎯 Common Queries

### Get Incoming Stock
```bash
GET /stock/getAll?movement_type=in
GET /stock/getAll?movement_type=in&source=purchase  # Purchases only
GET /stock/getAll?movement_type=in&source=return    # Returns only
GET /stock/getAll?movement_type=in&source=opening_stock  # Opening stock
```

### Get Outgoing Stock
```bash
GET /stock/getAll?movement_type=out
GET /stock/getAll?movement_type=out&source=sales  # Sales only
GET /stock/getAll?movement_type=out&source=adjustment  # Adjustments out
```

### Get by Date Range + Movement
```bash
GET /stock/getAll?movement_type=in&source=purchase&start_date=2025-12-01&end_date=2025-12-31
GET /stock/period?period=today&movement_type=out
GET /stock/period?period=this_month&movement_type=in&source=sales
```

### Get by Product/SKU with Movement
```bash
GET /stock/getAll?fk_id=5&movement_type=out
GET /stock/getAll?sku=MAT-001&movement_type=in
GET /stock/getAll?variant_id=PRD-001&source=sales
```

### Audit Trail for a Product
```bash
GET /stock/getAll?sku=MAT-001  # All movements for this SKU
```

---

## 📊 Movement Type Enum

```
'in'  → Stock incoming (purchases, returns, opening stock)
'out' → Stock outgoing (sales, consumption, adjustment)
```

---

## 🏷️ Source Enum

```
'purchase'      → Purchased from supplier
'sales'         → Sold to customer
'adjustment'    → Manual inventory adjustment
'return'        → Returned from customer
'opening_stock' → Initial system stock
```

---

## 💾 JSON Payload Examples

### Single Stock Create
```json
{
  "item_type": "material",
  "fk_id": 5,
  "sku": "MAT-001",
  "qty": 100,
  "cost": 50.00,
  "movement_type": "in",
  "source": "purchase",
  "date": "2025-12-06",
  "createdBy": 1
}
```

### Bulk Create
```json
{
  "movement_type": "in",
  "source": "purchase",
  "grn_date": "2025-12-06",
  "items": [
    {"sku": "MAT-001", "fk_id": 5, "qty": 100, "cost": 50},
    {"sku": "MAT-002", "fk_id": 6, "qty": 50, "cost": 75}
  ]
}
```

### Adjustment
```json
{
  "product_id": 5,
  "qty": -10,
  "note": "Damaged units",
  "movement_type": "out",
  "source": "adjustment",
  "createdBy": 1
}
```

### Sale (Auto-assigns)
```json
{
  "items": [
    {"variant_id": "PRD-001", "qty": 5},
    {"variant_id": "PRD-002", "qty": 3}
  ],
  "createdBy": 1
}
// Auto-sets: movement_type: 'out', source: 'sales'
```

---

## 🔍 Filter Combinations

| Use Case | Query |
|----------|-------|
| Today's purchases | `/stock/period?period=today&movement_type=in&source=purchase` |
| This month's sales | `/stock/getAll?month=12&year=2025&movement_type=out&source=sales` |
| All adjustments | `/stock/getAll?source=adjustment` |
| Purchase returns | `/stock/getAll?movement_type=in&source=return` |
| Product audit | `/stock/getAll?sku=MAT-001` |
| Damaged/loss tracking | `/stock/getAll?source=adjustment&movement_type=out` |

---

## ⚙️ Default Values

When not specified:
- `movement_type`: defaults to `'in'`
- `source`: defaults to `'adjustment'`

Example: `POST /stock/add` with only basic fields creates incoming adjustment stock.

---

## 📋 Integration Points

### Dashboard
```javascript
// Today's movements
fetch('/api/stock/period?period=today&movement_type=in&source=purchase')
fetch('/api/stock/period?period=today&movement_type=out&source=sales')
```

### Reports
```javascript
// Monthly breakdown
fetch('/api/stock/getAll?month=12&year=2025&movement_type=in&source=purchase')
fetch('/api/stock/getAll?month=12&year=2025&movement_type=out&source=sales')
```

### Audit
```javascript
// Product history
fetch('/api/stock/getAll?sku=MAT-001&page=1&limit=100')
```

---

## 🧪 Postman Collection Setup

### Environment Variables
```json
{
  "base_url": "http://localhost:3000",
  "created_by": "1"
}
```

### Pre-request Script Examples
```javascript
// For bulk create - auto timestamp
pm.environment.set("today", new Date().toISOString().split('T')[0])
```

---

## 📚 Documentation Files

- `MOVEMENT_TRACKING_GUIDE.md` - Complete API reference
- `MOVEMENT_IMPLEMENTATION_SUMMARY.md` - Implementation details
- This file - Quick reference

---

## ✅ Validation Rules

| Field | Valid Values | Default |
|-------|---|---|
| movement_type | 'in', 'out' | 'in' |
| source | 'purchase', 'sales', 'adjustment', 'return', 'opening_stock' | 'adjustment' |

Database enforces with CHECK constraints + App validates with Sequelize.

---

## 🔗 Related Fields

Movement tracked alongside:
- `createdBy` - Who created the record
- `createdAt` - When it was created
- `updatedBy` - Last modifier
- `status` - Active/deleted
- `date` - Transaction date (DATEONLY)

Complete audit trail guaranteed! ✨
