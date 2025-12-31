# Stock Current Value - Function Flow

Complete flow of how stock quantity updates cascade through the system and refresh current stock values.

## 📊 System Overview

```
User Action (Stock Added)
    ↓
Stock Repository Method
    ├─ createStockEntry()
    ├─ bulkCreateStockEntries()
    ├─ adjustStock()
    ├─ convertMaterialsToProducts()
    └─ sellProducts()
    ↓
Stock Record Created in Database
    ↓
Refresh Function Called
    ├─ refreshCurrentValue() [Single Record]
    └─ refreshCurrentValueBulk() [Multiple Records]
    ↓
Current Stock Value Table Updated
    └─ stock_current_values table
    ↓
API Response with Updated Data
```

## 🔄 Core Flow: Stock Addition → Current Value Update

### Step 1: Stock Record Creation

```javascript
// Entry Point: Stock Repository
StockRepo.createStockEntry({ 
  product_id: 1, 
  qty: 100, 
  cost: 50.00, 
  movement_type: 'IN',
  source: 'PURCHASE'
})
```

### Step 2: Database Insert

```sql
INSERT INTO stock_records (
  product_id, qty, cost, movement_type, source, date, status
) VALUES (
  1, 100, 50.00, 'IN', 'PURCHASE', NOW(), 'ACTIVE'
)
RETURNING *
```

### Step 3: Trigger Refresh Function

```javascript
// Line 10-11 in stock.repository.js
const newStock = await Stock.create(stockData);
await refreshCurrentValue(newStock).catch(err => console.error(err));
```

### Step 4: Calculate Current Quantity

```javascript
// refreshCurrentValue() flow:
// 1. Get all active stock records for this product_id
// 2. SUM(qty) for current quantity
// 3. Get latest cost from most recent record
// 4. Upsert into stock_current_values table
```

### Step 5: Current Value Table Updated

```sql
-- Before:
stock_current_values: PROD0001, qty=100, cost=50

-- After insertion of 50 more units:
stock_current_values: PROD0001, qty=150, cost=50
```

## 🎯 Function Methods & Their Flows

### 1️⃣ createStockEntry() - Single Record

```
POST /stock/add → StockController.create()
    ↓
StockRepo.createStockEntry(data)
    ↓
Stock.create(stockData)
    ↓
refreshCurrentValue(newStock) ← AUTO CALLED
    ↓
StockCurrentValue.upsert()
    ↓
✅ Response: { success: true, data: newStock }
```

**Affected Records**: 1 item
**Refresh Method**: `refreshCurrentValue()`

---

### 2️⃣ bulkCreateStockEntries() - Multiple Records

```
POST /stock/bulk → StockController.bulkCreate()
    ↓
StockRepo.bulkCreateStockEntries(array)
    ↓
Stock.bulkCreate(stockDataArray)
    ↓
refreshCurrentValueBulk(createdStocks) ← AUTO CALLED
    ↓
For each stock record:
  └─ StockCurrentValue.upsert()
    ↓
✅ Response: { success: true, data: createdStocks }
```

**Affected Records**: N items (potentially many)
**Refresh Method**: `refreshCurrentValueBulk()`

---

### 3️⃣ adjustStock() - Single Adjustment

```
POST /stock/adjust → StockController.adjust()
    ↓
StockRepo.adjustStock({
  product_id: 1,
  qty: 50,
  movement_type: 'OUT',
  source: 'ADJUSTMENT'
})
    ↓
Stock.create() + StockAdjustment.create()
    ↓
refreshCurrentValue(record) ← AUTO CALLED
    ↓
StockCurrentValue.upsert()
    ↓
✅ Response: { success: true, data: record }
```

**Affected Records**: 1 item
**Refresh Method**: `refreshCurrentValue()`

---

### 4️⃣ convertMaterialsToProducts() - Multiple Items

```
POST /stock/convert → StockController.convert()
    ↓
StockRepo.convertMaterialsToProducts({
  materials: [{ variant_id: 'MAT0001', qty: 10 }],
  product_variant: 'PROD0001',
  produced_qty: 5
})
    ↓
Transaction Start
    ├─ For each material:
    │   └─ Stock.create({qty: -10, OUT})  ← Material decrement
    │
    └─ Stock.create({qty: +5, IN})       ← Product increment
    ↓
Transaction Commit
    ↓
refreshCurrentValueBulk(createdRecords) ← AUTO CALLED
    ↓
For each affected item:
  └─ StockCurrentValue.upsert()
    ↓
✅ Response: { success: true }
```

**Affected Records**: materials.length + 1 (materials OUT + 1 product IN)
**Refresh Method**: `refreshCurrentValueBulk()`

---

### 5️⃣ sellProducts() - Sales Deduction

```
POST /stock/sell → StockController.sell()
    ↓
StockRepo.sellProducts({
  items: [
    { variant_id: 'PROD0001', qty: 5 },
    { variant_id: 'PROD0002', qty: 3 }
  ]
})
    ↓
Transaction Start
    ├─ Stock.create({product_id: 1, qty: -5, OUT, SALES})
    └─ Stock.create({product_id: 2, qty: -3, OUT, SALES})
    ↓
Transaction Commit
    ↓
refreshCurrentValueBulk(createdRecords) ← AUTO CALLED
    ↓
For each product sold:
  └─ StockCurrentValue.upsert()
    ↓
✅ Response: { success: true }
```

**Affected Records**: items.length (all products sold)
**Refresh Method**: `refreshCurrentValueBulk()`

---

## 🔧 Refresh Function Details

### refreshCurrentValue() - Single Item

```javascript
// Location: src/models/stock.model.js
// Called for: Single stock record operations

async function refreshCurrentValue(stockRecord) {
  // 1. Get product details
  const product = await Product.findByPk(stockRecord.product_id);
  
  // 2. Calculate current quantity
  const totalQty = await Stock.sum('qty', {
    where: { 
      product_id: stockRecord.product_id,
      status: 'ACTIVE'
    }
  });
  
  // 3. Get last cost
  const lastRecord = await Stock.findOne({
    where: { product_id: stockRecord.product_id },
    order: [['date', 'DESC']],
    attributes: ['cost']
  });
  
  // 4. Upsert current value
  await StockCurrentValue.upsert({
    item_type: product.item_type,
    fk_id: product.id,
    sku: product.sku,
    variant_id: product.variant_id,
    item_name: product.name,
    current_quantity: totalQty || 0,
    unit: product.unit,
    last_movement_date: new Date(),
    last_cost: lastRecord?.cost || 0
  });
}
```

### refreshCurrentValueBulk() - Multiple Items

```javascript
// Location: src/models/stock.model.js
// Called for: Bulk/transaction operations

async function refreshCurrentValueBulk(stockRecords) {
  // Get unique product_ids from stock records
  const productIds = [...new Set(stockRecords.map(r => r.product_id))];
  
  // For each affected product
  for (const productId of productIds) {
    // 1. Get product
    const product = await Product.findByPk(productId);
    
    // 2. Calculate total qty
    const totalQty = await Stock.sum('qty', {
      where: { product_id: productId, status: 'ACTIVE' }
    });
    
    // 3. Get latest cost
    const lastRecord = await Stock.findOne({
      where: { product_id: productId },
      order: [['date', 'DESC']],
      attributes: ['cost']
    });
    
    // 4. Upsert
    await StockCurrentValue.upsert({
      item_type: product.item_type,
      fk_id: productId,
      sku: product.sku,
      variant_id: product.variant_id,
      item_name: product.name,
      current_quantity: totalQty || 0,
      unit: product.unit,
      last_movement_date: new Date(),
      last_cost: lastRecord?.cost || 0
    });
  }
}
```

## 📥 Data Flow Example: Adding Stock

### Scenario: Add 100 units of PROD0001 at $50 cost

**Initial State:**
```
stock_records: PROD0001 has 0 records (new product)
stock_current_values: PROD0001 does not exist
```

**Request:**
```javascript
POST /stock/add
{
  "product_id": 1,
  "variant_id": "PROD0001",
  "qty": 100,
  "cost": 50.00,
  "movement_type": "IN",
  "source": "PURCHASE"
}
```

**Execution:**
```
1. StockController.create()
   ↓
2. StockRepo.createStockEntry({...})
   ↓
3. Stock.create({...})
   → INSERT INTO stock_records VALUES (
       product_id=1, qty=100, cost=50, 
       movement_type='IN', source='PURCHASE'
     )
   ↓
4. refreshCurrentValue(newStock) called
   ↓
5. Calculate:
   - SUM(qty) WHERE product_id=1 = 100
   - Last cost = 50
   ↓
6. StockCurrentValue.upsert({
     product_id: 1,
     current_quantity: 100,
     last_cost: 50,
     ...
   })
   ↓
7. Return response
```

**Final State:**
```
stock_records:
  ├─ id=1, product_id=1, qty=100, cost=50

stock_current_values:
  ├─ product_id=1, current_quantity=100, last_cost=50
```

---

## 📤 Data Flow Example: Selling Products

### Scenario: Sell 30 units of PROD0001

**Initial State:**
```
stock_records: PROD0001 has qty=100 total
stock_current_values: PROD0001, qty=100
```

**Request:**
```javascript
POST /stock/sell
{
  "items": [
    { "variant_id": "PROD0001", "qty": 30 }
  ]
}
```

**Execution:**
```
1. StockController.sell()
   ↓
2. StockRepo.sellProducts({...})
   ↓
3. BEGIN TRANSACTION
   ↓
4. Stock.create({
     product_id: 1,
     qty: -30,
     movement_type: 'OUT',
     source: 'SALES'
   })
   ↓
5. COMMIT TRANSACTION
   ↓
6. refreshCurrentValueBulk([saleRecord]) called
   ↓
7. Calculate:
   - SUM(qty) WHERE product_id=1
   - Records: +100 (purchase) + (-30) (sale) = 70
   - Last cost = 50
   ↓
8. StockCurrentValue.upsert({
     product_id: 1,
     current_quantity: 70,
     last_cost: 50,
     ...
   })
   ↓
9. Return response
```

**Final State:**
```
stock_records:
  ├─ id=1, product_id=1, qty=100, cost=50, movement='IN'
  └─ id=2, product_id=1, qty=-30, movement='OUT'

stock_current_values:
  ├─ product_id=1, current_quantity=70, last_cost=50
```

---

## ⚡ Automatic Update Points

All these operations **automatically** trigger current value refresh:

| Operation | Function | Records Affected |
|-----------|----------|-----------------|
| Add 1 stock | `createStockEntry()` | 1 product |
| Add N stocks | `bulkCreateStockEntries()` | N products |
| Adjust stock | `adjustStock()` | 1 product |
| Convert materials | `convertMaterialsToProducts()` | N materials + 1 product |
| Sell products | `sellProducts()` | N products sold |

---

## 🔍 Verification Query

Check current stock value for PROD0001:

```sql
SELECT * FROM stock_current_values 
WHERE sku = 'PROD0001';

-- Result:
┌────┬──────────┬─────────────────┬──────────────┐
│ id │ sku      │ current_quantity │ last_cost    │
├────┼──────────┼─────────────────┼──────────────┤
│ 1  │ PROD0001 │ 70              │ 50.00        │
└────┴──────────┴─────────────────┴──────────────┘
```

---

## 📡 API Endpoints Reference

### Stock Operations

| Endpoint | Method | Refresh Method | Affected Records |
|----------|--------|----------------|-----------------|
| `/stock/add` | POST | `refreshCurrentValue()` | 1 |
| `/stock/bulk` | POST | `refreshCurrentValueBulk()` | N |
| `/stock/adjust` | POST | `refreshCurrentValue()` | 1 |
| `/stock/convert` | POST | `refreshCurrentValueBulk()` | N+1 |
| `/stock/sell` | POST | `refreshCurrentValueBulk()` | N |

### View Current Values

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/stock-current/all` | GET | Get all current values |
| `/stock-current/by-sku/:sku` | GET | Get specific SKU current value |
| `/stock-current/summary` | GET | Get stock summary with filters |

---

## ✅ Verification Checklist

After any stock operation:

- [ ] Stock record created in `stock_records` table
- [ ] `refreshCurrentValue()` or `refreshCurrentValueBulk()` called
- [ ] `stock_current_values` table updated with:
  - [ ] Latest quantity sum
  - [ ] Latest cost
  - [ ] Movement timestamp
- [ ] API response contains updated data
- [ ] No orphaned records in current values table

---

## 🐛 Troubleshooting

### Issue: Current value not updating

**Check:**
1. Was `refreshCurrentValue()` called after stock creation?
2. Are there stock records with `status='ACTIVE'`?
3. Is the product_id valid?

**Query:**
```sql
SELECT * FROM stock_records WHERE product_id = ? AND status = 'ACTIVE';
```

### Issue: Incorrect quantity calculation

**Check:**
1. Verify all stock records for the product
2. Sum qty should match current_quantity

**Query:**
```sql
SELECT SUM(qty) as actual_qty FROM stock_records 
WHERE product_id = ? AND status = 'ACTIVE';

SELECT current_quantity FROM stock_current_values 
WHERE fk_id = ?;
```

### Issue: Old cost showing

**Check:**
1. Last cost should be from the most recent record

**Query:**
```sql
SELECT cost FROM stock_records 
WHERE product_id = ? 
ORDER BY date DESC LIMIT 1;
```

---

## 🎓 Key Takeaways

1. **Automatic**: Every stock operation automatically updates current values
2. **Real-time**: No caching or delayed updates
3. **Transactional**: Bulk operations maintain data consistency
4. **Indexed**: `stock_current_values` table optimized for fast lookups
5. **Accurate**: Current quantity = SUM of all ACTIVE stock records
