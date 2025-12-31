import sequelize from '../src/config/db.js';
import { Stock } from '../src/models/stock.model.js';
import { StockMonthlySummary } from '../src/models/stock-summary.model.js';

/**
 * Script to seed both stock_records and stock_monthly_summaries with correlated data
 * This ensures opening balances in summaries match actual stock movements
 */

const seedCorrelatedStockData = async () => {
    try {
        console.log('🌱 Starting correlated stock data seeding...\n');

        // ===== SAMPLE DATA SETUP =====
        const SKUs = [
            { sku: 'PROD0001', item_type: 'PRODUCT', fk_id: 1, item_name: 'JD', unit: 'UNIT' },
            { sku: 'MAT0004', item_type: 'MATERIAL', fk_id: 4, item_name: 'SWD', unit: 'KG' }
        ];

        // Month 1: September 2025 (initial stock)
        const sept2025Data = [
            // PROD0001 - Opening stock
            { sku: 'PROD0001', item_type: 'PRODUCT', fk_id: 1, item_name: 'JD', unit: 'UNIT', 
              date: '2025-09-05', movement_type: 'IN', source: 'PURCHASE', qty: 100, cost: 50.00 },
            { sku: 'PROD0001', item_type: 'PRODUCT', fk_id: 1, item_name: 'JD', unit: 'UNIT',
              date: '2025-09-12', movement_type: 'IN', source: 'PURCHASE', qty: 50, cost: 52.00 },
            { sku: 'PROD0001', item_type: 'PRODUCT', fk_id: 1, item_name: 'JD', unit: 'UNIT',
              date: '2025-09-20', movement_type: 'OUT', source: 'SALES', qty: 30, cost: 50.00 },

            // MAT0004 - Opening stock
            { sku: 'MAT0004', item_type: 'MATERIAL', fk_id: 4, item_name: 'SWD', unit: 'KG',
              date: '2025-09-03', movement_type: 'IN', source: 'PURCHASE', qty: 200, cost: 25.00 },
            { sku: 'MAT0004', item_type: 'MATERIAL', fk_id: 4, item_name: 'SWD', unit: 'KG',
              date: '2025-09-18', movement_type: 'OUT', source: 'ADJUSTMENT', qty: 20, cost: 25.00 }
        ];

        // Month 2: October 2025
        const oct2025Data = [
            // PROD0001
            { sku: 'PROD0001', item_type: 'PRODUCT', fk_id: 1, item_name: 'JD', unit: 'UNIT',
              date: '2025-10-05', movement_type: 'IN', source: 'PURCHASE', qty: 80, cost: 53.00 },
            { sku: 'PROD0001', item_type: 'PRODUCT', fk_id: 1, item_name: 'JD', unit: 'UNIT',
              date: '2025-10-15', movement_type: 'OUT', source: 'SALES', qty: 60, cost: 51.00 },

            // MAT0004
            { sku: 'MAT0004', item_type: 'MATERIAL', fk_id: 4, item_name: 'SWD', unit: 'KG',
              date: '2025-10-10', movement_type: 'IN', source: 'PURCHASE', qty: 150, cost: 26.00 },
            { sku: 'MAT0004', item_type: 'MATERIAL', fk_id: 4, item_name: 'SWD', unit: 'KG',
              date: '2025-10-25', movement_type: 'OUT', source: 'ADJUSTMENT', qty: 30, cost: 25.50 }
        ];

        // Month 3: November 2025
        const nov2025Data = [
            // PROD0001
            { sku: 'PROD0001', item_type: 'PRODUCT', fk_id: 1, item_name: 'JD', unit: 'UNIT',
              date: '2025-11-08', movement_type: 'IN', source: 'PURCHASE', qty: 120, cost: 54.00 },
            { sku: 'PROD0001', item_type: 'PRODUCT', fk_id: 1, item_name: 'JD', unit: 'UNIT',
              date: '2025-11-22', movement_type: 'OUT', source: 'SALES', qty: 90, cost: 52.00 },

            // MAT0004
            { sku: 'MAT0004', item_type: 'MATERIAL', fk_id: 4, item_name: 'SWD', unit: 'KG',
              date: '2025-11-12', movement_type: 'IN', source: 'PURCHASE', qty: 100, cost: 27.00 },
            { sku: 'MAT0004', item_type: 'MATERIAL', fk_id: 4, item_name: 'SWD', unit: 'KG',
              date: '2025-11-28', movement_type: 'OUT', source: 'ADJUSTMENT', qty: 25, cost: 26.00 }
        ];

        // Month 4: December 2025
        const dec2025Data = [
            // PROD0001
            { sku: 'PROD0001', item_type: 'PRODUCT', fk_id: 1, item_name: 'JD', unit: 'UNIT',
              date: '2025-12-03', movement_type: 'IN', source: 'PURCHASE', qty: 75, cost: 55.00 },
            { sku: 'PROD0001', item_type: 'PRODUCT', fk_id: 1, item_name: 'JD', unit: 'UNIT',
              date: '2025-12-10', movement_type: 'OUT', source: 'SALES', qty: 40, cost: 53.00 },
            { sku: 'PROD0001', item_type: 'PRODUCT', fk_id: 1, item_name: 'JD', unit: 'UNIT',
              date: '2025-12-18', movement_type: 'IN', source: 'PURCHASE', qty: 100, cost: 56.00 },
            { sku: 'PROD0001', item_type: 'PRODUCT', fk_id: 1, item_name: 'JD', unit: 'UNIT',
              date: '2025-12-26', movement_type: 'OUT', source: 'SALES', qty: 85, cost: 54.00 },

            // MAT0004
            { sku: 'MAT0004', item_type: 'MATERIAL', fk_id: 4, item_name: 'SWD', unit: 'KG',
              date: '2025-12-05', movement_type: 'IN', source: 'PURCHASE', qty: 180, cost: 28.00 },
            { sku: 'MAT0004', item_type: 'MATERIAL', fk_id: 4, item_name: 'SWD', unit: 'KG',
              date: '2025-12-15', movement_type: 'OUT', source: 'ADJUSTMENT', qty: 35, cost: 27.00 },
            { sku: 'MAT0004', item_type: 'MATERIAL', fk_id: 4, item_name: 'SWD', unit: 'KG',
              date: '2025-12-22', movement_type: 'OUT', source: 'SALES', qty: 50, cost: 27.50 }
        ];

        // ===== STEP 1: Insert Stock Records =====
        console.log('📦 Step 1: Inserting stock records...\n');

        const allRecords = [...sept2025Data, ...oct2025Data, ...nov2025Data, ...dec2025Data];
        const createdRecords = await Stock.bulkCreate(allRecords, { returning: true });
        console.log(`✅ Created ${createdRecords.length} stock records`);

        // ===== STEP 2: Calculate and Insert Monthly Summaries =====
        console.log('\n📊 Step 2: Calculating monthly summaries...\n');

        // Helper function to calculate summary for a month
        const calculateMonthlySummary = (sku, itemType, fkId, itemName, unit, date, previousClosing, currentMonthData) => {
            const opening_qty = previousClosing.qty;
            const opening_value = previousClosing.value;

            let in_qty = 0, out_qty = 0, in_value = 0, out_value = 0;

            currentMonthData.forEach(record => {
                if (record.movement_type === 'IN') {
                    in_qty += Number(record.qty);
                    in_value += Number(record.qty) * Number(record.cost);
                } else if (record.movement_type === 'OUT') {
                    out_qty += Number(record.qty);
                    out_value += Number(record.qty) * Number(record.cost);
                }
            });

            const closing_qty = opening_qty + in_qty - out_qty;
            const closing_value = opening_value + in_value - out_value;

            return {
                date,
                sku,
                item_type: itemType,
                fk_id: fkId,
                item_name: itemName,
                unit,
                opening_qty,
                in_qty,
                out_qty,
                closing_qty,
                opening_value,
                in_value,
                out_value,
                closing_value,
                createdBy: 1
            };
        };

        const summaries = [];

        // PROD0001 Summaries
        let prod0001Closing = { qty: 0, value: 0 }; // Start with zero

        // September 2025 - PROD0001
        const prod0001Sept = sept2025Data.filter(r => r.sku === 'PROD0001');
        const prod0001SeptSummary = calculateMonthlySummary(
            'PROD0001', 'PRODUCT', 1, 'JD', 'UNIT',
            '2025-09-01',
            prod0001Closing,
            prod0001Sept
        );
        summaries.push(prod0001SeptSummary);
        prod0001Closing = { qty: prod0001SeptSummary.closing_qty, value: prod0001SeptSummary.closing_value };
        console.log(`  📝 PROD0001 Sept: Opening=${prod0001SeptSummary.opening_qty}, In=${prod0001SeptSummary.in_qty}, Out=${prod0001SeptSummary.out_qty}, Closing=${prod0001SeptSummary.closing_qty}`);

        // October 2025 - PROD0001
        const prod0001Oct = oct2025Data.filter(r => r.sku === 'PROD0001');
        const prod0001OctSummary = calculateMonthlySummary(
            'PROD0001', 'PRODUCT', 1, 'JD', 'UNIT',
            '2025-10-01',
            prod0001Closing,
            prod0001Oct
        );
        summaries.push(prod0001OctSummary);
        prod0001Closing = { qty: prod0001OctSummary.closing_qty, value: prod0001OctSummary.closing_value };
        console.log(`  📝 PROD0001 Oct: Opening=${prod0001OctSummary.opening_qty}, In=${prod0001OctSummary.in_qty}, Out=${prod0001OctSummary.out_qty}, Closing=${prod0001OctSummary.closing_qty}`);

        // November 2025 - PROD0001
        const prod0001Nov = nov2025Data.filter(r => r.sku === 'PROD0001');
        const prod0001NovSummary = calculateMonthlySummary(
            'PROD0001', 'PRODUCT', 1, 'JD', 'UNIT',
            '2025-11-01',
            prod0001Closing,
            prod0001Nov
        );
        summaries.push(prod0001NovSummary);
        prod0001Closing = { qty: prod0001NovSummary.closing_qty, value: prod0001NovSummary.closing_value };
        console.log(`  📝 PROD0001 Nov: Opening=${prod0001NovSummary.opening_qty}, In=${prod0001NovSummary.in_qty}, Out=${prod0001NovSummary.out_qty}, Closing=${prod0001NovSummary.closing_qty}`);

        // MAT0004 Summaries
        let mat0004Closing = { qty: 0, value: 0 }; // Start with zero

        // September 2025 - MAT0004
        const mat0004Sept = sept2025Data.filter(r => r.sku === 'MAT0004');
        const mat0004SeptSummary = calculateMonthlySummary(
            'MAT0004', 'MATERIAL', 4, 'SWD', 'KG',
            '2025-09-01',
            mat0004Closing,
            mat0004Sept
        );
        summaries.push(mat0004SeptSummary);
        mat0004Closing = { qty: mat0004SeptSummary.closing_qty, value: mat0004SeptSummary.closing_value };
        console.log(`  📝 MAT0004 Sept: Opening=${mat0004SeptSummary.opening_qty}, In=${mat0004SeptSummary.in_qty}, Out=${mat0004SeptSummary.out_qty}, Closing=${mat0004SeptSummary.closing_qty}`);

        // October 2025 - MAT0004
        const mat0004Oct = oct2025Data.filter(r => r.sku === 'MAT0004');
        const mat0004OctSummary = calculateMonthlySummary(
            'MAT0004', 'MATERIAL', 4, 'SWD', 'KG',
            '2025-10-01',
            mat0004Closing,
            mat0004Oct
        );
        summaries.push(mat0004OctSummary);
        mat0004Closing = { qty: mat0004OctSummary.closing_qty, value: mat0004OctSummary.closing_value };
        console.log(`  📝 MAT0004 Oct: Opening=${mat0004OctSummary.opening_qty}, In=${mat0004OctSummary.in_qty}, Out=${mat0004OctSummary.out_qty}, Closing=${mat0004OctSummary.closing_qty}`);

        // November 2025 - MAT0004
        const mat0004Nov = nov2025Data.filter(r => r.sku === 'MAT0004');
        const mat0004NovSummary = calculateMonthlySummary(
            'MAT0004', 'MATERIAL', 4, 'SWD', 'KG',
            '2025-11-01',
            mat0004Closing,
            mat0004Nov
        );
        summaries.push(mat0004NovSummary);
        mat0004Closing = { qty: mat0004NovSummary.closing_qty, value: mat0004NovSummary.closing_value };
        console.log(`  📝 MAT0004 Nov: Opening=${mat0004NovSummary.opening_qty}, In=${mat0004NovSummary.in_qty}, Out=${mat0004NovSummary.out_qty}, Closing=${mat0004NovSummary.closing_qty}`);

        // December 2025 - PROD0001
        const prod0001Dec = dec2025Data.filter(r => r.sku === 'PROD0001');
        const prod0001DecSummary = calculateMonthlySummary(
            'PROD0001', 'PRODUCT', 1, 'JD', 'UNIT',
            '2025-12-01',
            prod0001Closing,
            prod0001Dec
        );
        summaries.push(prod0001DecSummary);
        prod0001Closing = { qty: prod0001DecSummary.closing_qty, value: prod0001DecSummary.closing_value };
        console.log(`  📝 PROD0001 Dec: Opening=${prod0001DecSummary.opening_qty}, In=${prod0001DecSummary.in_qty}, Out=${prod0001DecSummary.out_qty}, Closing=${prod0001DecSummary.closing_qty}`);

        // December 2025 - MAT0004
        const mat0004Dec = dec2025Data.filter(r => r.sku === 'MAT0004');
        const mat0004DecSummary = calculateMonthlySummary(
            'MAT0004', 'MATERIAL', 4, 'SWD', 'KG',
            '2025-12-01',
            mat0004Closing,
            mat0004Dec
        );
        summaries.push(mat0004DecSummary);
        mat0004Closing = { qty: mat0004DecSummary.closing_qty, value: mat0004DecSummary.closing_value };
        console.log(`  📝 MAT0004 Dec: Opening=${mat0004DecSummary.opening_qty}, In=${mat0004DecSummary.in_qty}, Out=${mat0004DecSummary.out_qty}, Closing=${mat0004DecSummary.closing_qty}`);

        // Insert summaries
        const createdSummaries = await StockMonthlySummary.bulkCreate(summaries, { returning: true });
        console.log(`\n✅ Created ${createdSummaries.length} monthly summaries`);

        // ===== STEP 3: Verification =====
        console.log('\n🔍 Step 3: Verification...\n');

        // Verify PROD0001
        const prod0001Records = await Stock.findAll({
            where: { sku: 'PROD0001' },
            order: [['date', 'ASC']]
        });
        console.log(`  📦 PROD0001: ${prod0001Records.length} stock records`);

        const prod0001Summaries = await StockMonthlySummary.findAll({
            where: { sku: 'PROD0001' },
            order: [['date', 'ASC']]
        });
        console.log(`  📊 PROD0001: ${prod0001Summaries.length} monthly summaries`);

        // Verify MAT0004
        const mat0004Records = await Stock.findAll({
            where: { sku: 'MAT0004' },
            order: [['date', 'ASC']]
        });
        console.log(`  📦 MAT0004: ${mat0004Records.length} stock records`);

        const mat0004Summaries = await StockMonthlySummary.findAll({
            where: { sku: 'MAT0004' },
            order: [['date', 'ASC']]
        });
        console.log(`  📊 MAT0004: ${mat0004Summaries.length} monthly summaries`);

        // Display summary for January 2026 query
        console.log('\n📋 Summary for January 2026 Query:');
        console.log('  (January has no records, so opening balance should be December closing)');
        console.log(`  
  PROD0001 Opening for Jan 2026: Qty=${prod0001Closing.qty}, Value=${prod0001Closing.value.toFixed(2)}
  MAT0004 Opening for Jan 2026: Qty=${mat0004Closing.qty}, Value=${mat0004Closing.value.toFixed(2)}
        `);

        console.log('\n✅ Seeding completed successfully!');
        console.log('\n🧪 Test with:');
        console.log('  GET /stock/monthly-summary/all-skus?start_year=2025&start_month=12&end_year=2025&end_month=12');
        console.log('  GET /stock/monthly-summary/all-skus?start_year=2025&start_month=9&end_year=2025&end_month=12');
        console.log('  GET /stock/monthly-summary/all-skus?start_year=2026&start_month=1&end_year=2026&end_month=1');

    } catch (error) {
        console.error('❌ Error seeding data:', error);
        throw error;
    }
};

// Run the seeder
seedCorrelatedStockData()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n💥 Fatal error:', err);
        process.exit(1);
    });
