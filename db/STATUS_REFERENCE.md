# Stock Status Reference

## Status Values

The stock_records table now uses the following status enum values:

| Status | Description | Use Case | Default |
|--------|-------------|----------|---------|
| `available` | ✅ Stock is in inventory and available for use | New stock received via GRN | **YES** |
| `reserved` | 🔒 Stock is reserved for a specific order/customer | When an order is placed | No |
| `allocated` | 📦 Stock has been allocated to a shipment/production | During fulfillment process | No |
| `sold` | 💰 Stock has been sold and removed from inventory | After sale completion | No |
| `damaged` | 🚫 Stock is damaged and unusable | Quality issues, damage reports | No |
| `returned` | ↩️ Stock has been returned by customer | Return/RMA process | No |
| `expired` | ⏰ Stock has expired and is no longer usable | Product expiry date reached | No |
| `on_hold` | ⏸️ Stock is temporarily on hold (review, inspection, etc) | QA checks, pending approval | No |

---

## Status Workflow Example

```
Available (initial)
    ↓
    └─→ Reserved (when order placed)
            ↓
            └─→ Allocated (when shipped/used)
                    ↓
                    ├─→ Sold (final state)
                    ├─→ Damaged (quality issue)
                    ├─→ Returned (customer return)
                    └─→ Expired (product expired)

On_Hold (can be placed at any time during inspection/review)
    ↓
    └─→ Available or Damaged (after inspection result)
```

---

## Database Schema

### CHECK Constraint
```sql
ALTER TABLE stock_records
ADD CONSTRAINT check_status
CHECK (status IN ('available', 'reserved', 'allocated', 'sold', 'damaged', 'returned', 'expired', 'on_hold'));
```

### Default Value
```sql
ALTER TABLE stock_records 
ALTER COLUMN status SET DEFAULT 'available';
```

---

## API Usage

### Filter by Status
```bash
# Get all available stock
GET /stock/getAll?status=available

# Get reserved stock
GET /stock/getAll?status=reserved

# Get damaged stock
GET /stock/getAll?status=damaged

# Get all sold items (with date range)
GET /stock/getAll?status=sold&start_date=2025-12-01&end_date=2025-12-31
```

### Get Available Statuses
```bash
GET /stock/statuses

Response:
{
  "success": true,
  "data": ["available", "reserved", "allocated", "sold", "damaged", "returned", "expired", "on_hold"]
}
```

### Update Stock Status
```bash
PATCH /stock/status/:id/:status

# Example: Mark stock as damaged
PATCH /stock/status/123/damaged
```

---

## Frontend Integration

### Status Dropdown
The Stock page automatically fetches available statuses from `/stock/statuses` endpoint and displays them in a dropdown filter.

```javascript
// Frontend fetches statuses on mount
const loadStatuses = async () => {
  const res = await stockService.getStatuses();
  setStatuses(res.data); // ['available', 'reserved', ...]
};

// User selects status
<select value={status} onChange={(e) => setStatus(e.target.value)}>
  <option value="">-- Any --</option>
  {statuses && statuses.map(s => (
    <option key={s} value={s}>{s}</option>
  ))}
</select>
```

---

## Migration Impact

### Before Migration
Default status: `'active'`  
Valid values: Not restricted (any string allowed)

### After Migration
Default status: `'available'`  
Valid values: Restricted to 8 enum values

### Data Migration
All existing records with status `'active'` are automatically updated to `'available'` during migration.

---

## Validation

### Sequelize Model Validation
```javascript
status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'available',
    validate: {
        isIn: [['available', 'reserved', 'allocated', 'sold', 'damaged', 'returned', 'expired', 'on_hold']]
    }
}
```

### Database Constraint
The database enforces the CHECK constraint at the SQL level, preventing invalid status values from being inserted directly.

---

## Examples

### Create Stock with Default Status
```javascript
// GRN submission - status will default to 'available'
const payload = {
  type: 'grn',
  supplier: 'Supplier Name',
  grn_date: '2025-12-06',
  lines: [
    {
      fk_id: 18,
      sku: 'SKU-ABC',
      qty: 100,
      cost: 50.00
      // status not specified, will use default 'available'
    }
  ]
};
```

### Query Stock by Status
```javascript
// Get all available products
const available = await stockService.getAll({ 
  status: 'available',
  item_type: 'product'
});

// Get all damaged materials
const damaged = await stockService.getAll({ 
  status: 'damaged',
  item_type: 'material'
});
```

### Update Status
```javascript
// Mark stock as damaged
await stockService.updateStatus(stockId, 'damaged');

// Mark as sold
await stockService.updateStatus(stockId, 'sold');
```

---

## Reporting & Analytics

### Count by Status
```sql
SELECT status, COUNT(*) as count 
FROM stock_records 
GROUP BY status;
```

### Available Stock Value
```sql
SELECT SUM(qty * cost) as total_value
FROM stock_records
WHERE status = 'available';
```

### Inventory Aging
```sql
SELECT status, 
       DATE(createdAt) as received_date,
       COUNT(*) as qty
FROM stock_records
WHERE status IN ('available', 'on_hold')
GROUP BY status, DATE(createdAt)
ORDER BY DATE(createdAt) DESC;
```

---

## Status Validation Hierarchy

1. **Model Level** - Sequelize validates before sending to DB
2. **Database Level** - CHECK constraint prevents invalid values
3. **API Level** - Controller can add business logic checks
4. **Frontend Level** - Dropdown limits user selection

---

## Future Enhancements

- [ ] Add status reason/notes field
- [ ] Implement status transition rules/workflow
- [ ] Add timestamp for each status change
- [ ] Create audit log for status changes
- [ ] Add notifications for status transitions
- [ ] Implement status-based alerts (e.g., expired items)

---

## References

- Model: `backend/src/models/stock.model.js`
- Migration: `backend/db/migrations/20251206-update-stock-schema.sql`
- Controller: `backend/src/controllers/stock.controller.js`
- Frontend: `frontend/src/pages/Stock.jsx`
