STEP 1: Get SKU & Variant from Products & Materials
├── getAllProductVariants() → [Product variants]
└── getAllMaterialVariants() → [Material variants]
         ↓
STEP 2: Get Last Stock Summary
├── getLatestSummaryByPeriod() → Last summary
└── Extract closing_qty as starting point
         ↓
STEP 3: Get Stock Records After Last Summary
├── If summary exists → Get records from next month
└── If no summary → Get all records
         ↓
STEP 4: Calculate Current Quantity
├── Starting: last_summary.closing_qty (or 0)
├── Loop records: +IN qty, -OUT qty
├── Result: current_quantity
└── Track: last_movement_date, last_cost
         ↓
STEP 5: Update/Create StockCurrentValue
├── upsertStockCurrentValue()
└── Update existing or create new record

_______________________________________________________
[BulkSummary] Starting Bulk Stock Current Value Processing

[BulkSummary] Found 45 product variants
[BulkSummary] Found 32 material variants
[BulkSummary] Total: 77 items to process

[BulkSummary] ┌──────────────────────────────────────────────────────────────
[BulkSummary] │ Item (1/77): PRODUCT - Office Chair
[BulkSummary] │ SKU: SKU001 | Variant: 1
[BulkSummary] └──────────────────────────────────────────────────────────────
[BulkSummary]   Step 1: Item details ✓
[BulkSummary]   Step 2: Last summary - 2025-11-01 (Closing: 150)
[BulkSummary]   Step 3: Found 8 stock record(s) after last summary
[BulkSummary]   Step 4: Calculated current quantity = 158
[BulkSummary]             Last movement: 2026-01-01
[BulkSummary]             Last cost: 500.00
[BulkSummary]   Step 5: ✅ Stock current value updated successfully.

[BulkSummary] BULK PROCESSING COMPLETE
[BulkSummary] 📦 Items processed:    77
[BulkSummary] ✅ Created:            12
[BulkSummary] 🔄 Updated:            65
[BulkSummary] ❌ Failed:             0