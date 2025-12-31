/**
 * Seed script for Monthly Summary testing
 * Creates 3 months of stock entries for 5 materials and 3 products
 * Includes various IN/OUT movements to test summary aggregation
 */

import sequelize from '../src/config/db.js';
import { Stock, refreshCurrentValueBulk } from '../src/models/stock.model.js';
import { Material } from '../src/models/mat.model.js';
import { Product } from '../src/models/product.model.js';

const MOVEMENT_TYPES = {
  IN: 'IN',
  OUT: 'OUT'
};

const SOURCES = {
  PURCHASE: 'PURCHASE',
  PRODUCTION: 'PRODUCTION',
  SALES: 'SALES',
  ADJUSTMENT: 'ADJUSTMENT',
  RETURN: 'RETURN'
};

// Helper to generate date in YYYY-MM-DD format
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to generate random date within a month
const randomDateInMonth = (year, month) => {
  const day = Math.floor(Math.random() * 28) + 1; // Safe for all months
  return new Date(year, month - 1, day);
};

// Helper to generate random cost
const randomCost = (min, max) => {
  return (Math.random() * (max - min) + min).toFixed(2);
};

// Helper to generate random quantity
const randomQty = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const seedMonthlySummaryData = async () => {
  try {
    console.log('🌱 Starting Monthly Summary Test Data Seeding...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Fetch 5 materials
    const materials = await Material.findAll({
      limit: 5,
      order: [['id', 'ASC']],
      attributes: ['id', 'name', 'sku', 'unit']
    });

    if (materials.length < 5) {
      console.log('❌ Not enough materials found. Need at least 5 materials in database.');
      process.exit(1);
    }

    // Fetch 3 products
    const products = await Product.findAll({
      limit: 3,
      order: [['id', 'ASC']],
      attributes: ['id', 'name', 'sku']
    });

    if (products.length < 3) {
      console.log('❌ Not enough products found. Need at least 3 products in database.');
      process.exit(1);
    }

    console.log('📦 Selected Materials:');
    materials.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.name} (ID: ${m.id}, SKU: ${m.sku})`);
    });

    console.log('\n📦 Selected Products:');
    products.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (ID: ${p.id}, SKU: ${p.sku})`);
    });

    // Generate data for last 3 months
    const today = new Date();
    const months = [
      { year: today.getFullYear(), month: today.getMonth() - 2 }, // 2 months ago
      { year: today.getFullYear(), month: today.getMonth() - 1 }, // Last month
      { year: today.getFullYear(), month: today.getMonth() + 1 }  // Current month
    ];

    // Normalize month/year
    months.forEach(m => {
      if (m.month <= 0) {
        m.month += 12;
        m.year -= 1;
      }
    });

    console.log('\n📅 Generating data for months:');
    months.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.year}-${String(m.month).padStart(2, '0')}`);
    });

    const stockEntries = [];
    let entryCount = 0;

    // Generate stock entries for each month
    for (const monthInfo of months) {
      const { year, month } = monthInfo;
      const monthLabel = `${year}-${String(month).padStart(2, '0')}`;

      console.log(`\n🔄 Processing ${monthLabel}...`);

      // For each material
      for (const material of materials) {
        // Opening balance (only for first month)
        if (monthInfo === months[0]) {
          const openingQty = randomQty(50, 200);
          const openingCost = randomCost(100, 500);
          const openingDate = new Date(year, month - 2, 15); // Date before the first month

          stockEntries.push({
            item_type: 'MATERIAL',
            fk_id: material.id,
            sku: material.sku,
            variant_id: material.sku,
            item_name: material.name,
            qty: openingQty,
            cost: openingCost,
            movement_type: MOVEMENT_TYPES.IN,
            source: SOURCES.PURCHASE,
            date: formatDate(openingDate),
            unit: material.unit || 'kg',
            status: 'COMPLETED'
          });
          entryCount++;
        }

        // Generate 3-5 IN movements (purchases)
        const inCount = randomQty(3, 5);
        for (let i = 0; i < inCount; i++) {
          const date = randomDateInMonth(year, month);
          stockEntries.push({
            item_type: 'MATERIAL',
            fk_id: material.id,
            sku: material.sku,
            variant_id: material.sku,
            item_name: material.name,
            qty: randomQty(20, 100),
            cost: randomCost(100, 500),
            movement_type: MOVEMENT_TYPES.IN,
            source: SOURCES.PURCHASE,
            date: formatDate(date),
            unit: material.unit || 'kg',
            status: 'COMPLETED'
          });
          entryCount++;
        }

        // Generate 2-4 OUT movements (production/sales)
        const outCount = randomQty(2, 4);
        for (let i = 0; i < outCount; i++) {
          const date = randomDateInMonth(year, month);
          stockEntries.push({
            item_type: 'MATERIAL',
            fk_id: material.id,
            sku: material.sku,
            variant_id: material.sku,
            item_name: material.name,
            qty: randomQty(10, 50),
            cost: randomCost(100, 500),
            movement_type: MOVEMENT_TYPES.OUT,
            source: SOURCES.PRODUCTION,
            date: formatDate(date),
            unit: material.unit || 'kg',
            status: 'COMPLETED'
          });
          entryCount++;
        }
      }

      // For each product
      for (const product of products) {
        // Opening balance (only for first month)
        if (monthInfo === months[0]) {
          const openingQty = randomQty(20, 80);
          const openingCost = randomCost(500, 2000);
          const openingDate = new Date(year, month - 2, 15);

          stockEntries.push({
            item_type: 'PRODUCT',
            fk_id: product.id,
            sku: product.sku,
            variant_id: product.sku,
            item_name: product.name,
            qty: openingQty,
            cost: openingCost,
            movement_type: MOVEMENT_TYPES.IN,
            source: SOURCES.PRODUCTION,
            date: formatDate(openingDate),
            unit: 'pcs',
            status: 'COMPLETED'
          });
          entryCount++;
        }

        // Generate 2-4 IN movements (production)
        const inCount = randomQty(2, 4);
        for (let i = 0; i < inCount; i++) {
          const date = randomDateInMonth(year, month);
          stockEntries.push({
            item_type: 'PRODUCT',
            fk_id: product.id,
            sku: product.sku,
            variant_id: product.sku,
            item_name: product.name,
            qty: randomQty(10, 50),
            cost: randomCost(500, 2000),
            movement_type: MOVEMENT_TYPES.IN,
            source: SOURCES.PRODUCTION,
            date: formatDate(date),
            unit: 'pcs',
            status: 'COMPLETED'
          });
          entryCount++;
        }

        // Generate 3-6 OUT movements (sales)
        const outCount = randomQty(3, 6);
        for (let i = 0; i < outCount; i++) {
          const date = randomDateInMonth(year, month);
          stockEntries.push({
            item_type: 'PRODUCT',
            fk_id: product.id,
            sku: product.sku,
            variant_id: product.sku,
            item_name: product.name,
            qty: randomQty(5, 30),
            cost: randomCost(500, 2000),
            movement_type: MOVEMENT_TYPES.OUT,
            source: SOURCES.SALES,
            date: formatDate(date),
            unit: 'pcs',
            status: 'COMPLETED'
          });
          entryCount++;
        }

        // Add occasional adjustment
        if (Math.random() > 0.7) {
          const date = randomDateInMonth(year, month);
          const isIn = Math.random() > 0.5;
          stockEntries.push({
            item_type: 'PRODUCT',
            fk_id: product.id,
            sku: product.sku,
            variant_id: product.sku,
            item_name: product.name,
            qty: randomQty(1, 10),
            cost: randomCost(500, 2000),
            movement_type: isIn ? MOVEMENT_TYPES.IN : MOVEMENT_TYPES.OUT,
            source: SOURCES.ADJUSTMENT,
            date: formatDate(date),
            unit: 'pcs',
            status: 'COMPLETED'
          });
          entryCount++;
        }
      }
    }

    console.log(`\n📊 Total entries to insert: ${entryCount}`);
    console.log('💾 Inserting into database...\n');

    // Bulk insert without hooks for performance
    const created = await Stock.bulkCreate(stockEntries, {
      validate: true,
      individualHooks: false,
      hooks: false
    });

    console.log(`✅ Successfully created ${created.length} stock entries!`);
    
    // Manually refresh current values for all items
    console.log('🔄 Refreshing current values...\n');
    await refreshCurrentValueBulk(created);
    console.log('✅ Current values refreshed!\n');

    // Summary stats
    console.log('📈 Summary by Item Type:');
    const materialEntries = created.filter(e => e.item_type === 'MATERIAL');
    const productEntries = created.filter(e => e.item_type === 'PRODUCT');
    console.log(`   Materials: ${materialEntries.length} entries`);
    console.log(`   Products: ${productEntries.length} entries`);

    console.log('\n📈 Summary by Movement Type:');
    const inEntries = created.filter(e => e.movement_type === 'IN');
    const outEntries = created.filter(e => e.movement_type === 'OUT');
    console.log(`   IN: ${inEntries.length} entries`);
    console.log(`   OUT: ${outEntries.length} entries`);

    console.log('\n🎯 Next Steps:');
    console.log('   1. Generate monthly summaries:');
    console.log('      POST http://localhost:3000/stock/monthly-summaries/generate-from-last-month');
    months.forEach((m, i) => {
      console.log(`      Body: { "year": ${m.year}, "month": ${m.month} }`);
    });
    console.log('\n   2. View summaries in frontend:');
    console.log('      Click "Summary (Last Month)" button in Stock page');
    console.log('\n   3. Or query via API:');
    months.forEach((m, i) => {
      console.log(`      GET http://localhost:3000/stock/monthly-summaries?year=${m.year}&month=${m.month}`);
    });

    console.log('\n✅ Seeding complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the seeder
seedMonthlySummaryData();
