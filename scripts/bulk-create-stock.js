// Bulk Create Stock via Sequelize
// Usage: node .\scripts\bulk-create-stock.js
// This script uses bulkCreate for faster batch inserts (bypasses HTTP API)

import sequelize from '../src/config/db.js';
import { Stock } from '../src/models/stock.model.js';

const productsData = [
  { id: 18, sku: "SKU-ABC", variant_id: "SKU-ABC*8", quantity: 100, cost: "904", mrp: "11" },
  { id: 17, sku: "SKU-ABC", variant_id: "SKU-ABC*7", quantity: 100, cost: "904", mrp: "11" },
  { id: 16, sku: "SKU-ABC", variant_id: "SKU-ABC*6", quantity: 100, cost: "904", mrp: "1" },
  { id: 14, sku: "pr0013", variant_id: "pr0013", quantity: 12, cost: "12", mrp: "34510" },
  { id: 13, sku: "SKU-ABC", variant_id: "SKU-ABC*5", quantity: 100, cost: "904", mrp: "653650100" },
  { id: 12, sku: "SKU-ABC", variant_id: "SKU-ABC*4", quantity: 100, cost: "90", mrp: "6536501230" },
  { id: 11, sku: "SKU-ABC", variant_id: "SKU-ABC*3", quantity: 100, cost: "90", mrp: "1" },
  { id: 10, sku: "SKU-ABC", variant_id: "SKU-ABC*1", quantity: 100, cost: "90", mrp: "653650" },
  { id: 9, sku: "SKU-ABC", variant_id: "SKU-ABC*2", quantity: 100, cost: "90", mrp: "65365" },
  { id: 8, sku: "SKU-ABC", variant_id: "SKU-ABC*promo1", quantity: 100, cost: "90", mrp: "120" },
  { id: 7, sku: "SKU-ABC", variant_id: "SKU-ABC", quantity: 100, cost: "100", mrp: "150" },
  { id: 5, sku: "P-005", variant_id: "P-005", quantity: 5, cost: "25.00", mrp: "30.00" },
  { id: 4, sku: "P-004", variant_id: "P-004", quantity: 4, cost: "20.00", mrp: "24.00" },
  { id: 3, sku: "P-003", variant_id: "P-003", quantity: 3, cost: "15.00", mrp: "18.00" },
  { id: 2, sku: "P-002", variant_id: "P-002", quantity: 2, cost: "20.00", mrp: "24.00" },
  { id: 1, sku: "P-001", variant_id: "P-001", quantity: 1, cost: "10.00", mrp: "12.00" }
];

async function bulkCreateStock() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Map product data to stock rows
    const stockRows = productsData.map(p => ({
      product_id: Number(p.id),
      product_sku: p.sku,
      variant_id: p.variant_id,
      batch_number: `BATCH-${new Date().toISOString().split('T')[0]}`, // Auto-generate batch number by date
      qty: Number(p.quantity),
      cost: Number(p.cost),
      description: 'Bulk created via bulk-create-stock.js',
      status: 'available'
    }));

    console.log(`Bulk creating ${stockRows.length} stock records...`);
    const created = await Stock.bulkCreate(stockRows, { returning: true });

    console.log(`✓ Successfully created ${created.length} stock records.`);
    console.log('Sample records:');
    created.slice(0, 3).forEach((rec, idx) => {
      console.log(`  [${idx + 1}] id=${rec.id}, product_id=${rec.product_id}, variant_id=${rec.variant_id}, qty=${rec.qty}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error during bulk create:', error.message);
    console.error(error);
    process.exit(1);
  }
}

bulkCreateStock();
