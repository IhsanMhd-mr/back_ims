// Seeder: seed-stock-varied-dates.js
// Populates stock_records with varied date ranges: 3 months ago, last week, yesterday, today
// ID will auto-increment - do not manually assign
// Usage: node .\scripts\seed-stock-varied-dates.js

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

// Helper to create date with specific time
function createDate(daysAgo, hours = 9, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function seedStockVariedDates() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Generate stock records with varied dates
    const stockRows = [];
    const now = new Date();

    // 1. Records from 3 months ago (approximately 90 days)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    console.log(`Seeding records from 3 months ago (around ${threeMonthsAgo.toDateString()})...`);
    
    for (let i = 0; i < 20; i++) {
      const product = productsData[i % productsData.length];
      const dayOffset = Math.floor(Math.random() * 90); // within 90 days of 3 months ago
      const createdAt = new Date(threeMonthsAgo);
      createdAt.setDate(createdAt.getDate() + dayOffset);
      createdAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
      
      stockRows.push({
        product_id: Number(product.id),
        product_sku: product.sku,
        variant_id: product.variant_id,
        batch_number: `BATCH-3M-${i + 1}`,
        qty: 50 + Math.floor(Math.random() * 50),
        cost: Number(product.cost),
        description: 'Stock from 3 months ago',
        status: 'available',
        createdAt,
        updatedAt: createdAt
      });
    }

    // 2. Records from last week (7-21 days ago)
    console.log('Seeding records from last week...');
    for (let i = 0; i < 20; i++) {
      const product = productsData[i % productsData.length];
      const daysAgo = 7 + Math.floor(Math.random() * 14); // 7-21 days ago
      const createdAt = createDate(daysAgo, 8 + Math.floor(Math.random() * 16));
      
      stockRows.push({
        product_id: Number(product.id),
        product_sku: product.sku,
        variant_id: product.variant_id,
        batch_number: `BATCH-WEEK-${i - 4}`,
        qty: 20 + Math.floor(Math.random() * 40),
        cost: Number(product.cost),
        description: 'Stock from last week',
        status: 'available',
        createdAt,
        updatedAt: createdAt
      });
    }

    // 3. Records from yesterday (1 day ago)
    console.log('Seeding records from yesterday...');
    for (let i = 0; i < 12; i++) {
      const product = productsData[i % productsData.length];
      const createdAt = createDate(1, 9 + Math.floor(Math.random() * 12));
      
      stockRows.push({
        product_id: Number(product.id),
        product_sku: product.sku,
        variant_id: product.variant_id,
        batch_number: `BATCH-YESTERDAY-${i - 9}`,
        qty: 10 + Math.floor(Math.random() * 30),
        cost: Number(product.cost),
        description: 'Stock from yesterday',
        status: 'available',
        createdAt,
        updatedAt: createdAt
      });
    }

    // 4. Records from today (now)
    console.log('Seeding records from today...');
    for (let i = 0; i < 8; i++) {
      const product = productsData[i % productsData.length];
      const createdAt = new Date();
      createdAt.setHours(Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
      
      stockRows.push({
        product_id: Number(product.id),
        product_sku: product.sku,
        variant_id: product.variant_id,
        batch_number: `BATCH-TODAY-${i - 13}`,
        qty: 5 + Math.floor(Math.random() * 25),
        cost: Number(product.cost),
        description: 'Stock from today',
        status: 'available',
        createdAt,
        updatedAt: createdAt
      });
    }

    console.log(`\nBulk creating ${stockRows.length} stock records with varied dates...`);
    const created = await Stock.bulkCreate(stockRows, { returning: true });

    console.log(`\n✓ Successfully created ${created.length} stock records.\n`);
    
    // Show summary by date range
    const threeMonthsCount = created.filter(r => r.createdAt >= threeMonthsAgo).length;
    const lastWeekCount = created.filter(r => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return r.createdAt >= d;
    }).length;
    const yesterdayCount = created.filter(r => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      d.setHours(0, 0, 0, 0);
      return r.createdAt >= d && r.createdAt < new Date().setHours(0, 0, 0, 0);
    }).length;
    const todayCount = created.filter(r => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return r.createdAt >= d;
    }).length;

    console.log('Date range breakdown:');
    console.log(`  • 3 months ago area: ${created.filter(r => r.createdAt <= threeMonthsAgo.setDate(threeMonthsAgo.getDate() + 10)).length} records`);
    console.log(`  • Last week: ${lastWeekCount} records`);
    console.log(`  • Yesterday: ${yesterdayCount} records`);
    console.log(`  • Today: ${todayCount} records`);
    console.log('\nSample records:');
    created.slice(0, 3).forEach((rec, idx) => {
      console.log(`  [${idx + 1}] id=${rec.id}, batch=${rec.batch_number}, variant=${rec.variant_id}, qty=${rec.qty}, created=${rec.createdAt.toLocaleString()}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedStockVariedDates();
