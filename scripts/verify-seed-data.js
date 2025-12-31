/**
 * Verify seed data integrity
 * Checks if stock entries and summaries are correctly aligned
 */

import http from 'http';

const API_BASE = 'localhost';
const API_PORT = 3000;

const getStockRecords = (params) => {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams(params).toString();
    const options = {
      hostname: API_BASE,
      port: API_PORT,
      path: `/stock/getAll?${queryString}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

const getSummaries = (year, month) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      port: API_PORT,
      path: `/stock/monthly-summaries?year=${year}&month=${month}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

const run = async () => {
  console.log('🔍 Verifying Seed Data Integrity\n');
  console.log('='.repeat(100));

  // Check September 2025
  console.log('\n📅 SEPTEMBER 2025');
  console.log('-'.repeat(100));

  try {
    // Get stock records for material ID 1 in September
    const stockRes = await getStockRecords({ 
      item_type: 'MATERIAL', 
      fk_id: 1, 
      limit: 100,
      start_date: '2025-09-01',
      end_date: '2025-09-30'
    });

    if (stockRes.data.success && stockRes.data.data) {
      const records = stockRes.data.data;
      console.log(`\n📦 Stock Records for MATERIAL ID=1 in September: ${records.length} records`);
      
      const inRecords = records.filter(r => r.movement_type === 'IN');
      const outRecords = records.filter(r => r.movement_type === 'OUT');
      
      const totalIn = inRecords.reduce((sum, r) => sum + Number(r.qty || 0), 0);
      const totalOut = outRecords.reduce((sum, r) => sum + Number(r.qty || 0), 0);
      
      console.log(`   IN movements: ${inRecords.length} records, Total qty: ${totalIn}`);
      console.log(`   OUT movements: ${outRecords.length} records, Total qty: ${totalOut}`);
    }

    // Check for opening balance (before Sept 1)
    const openingRes = await getStockRecords({ 
      item_type: 'MATERIAL', 
      fk_id: 1, 
      limit: 100,
      end_date: '2025-08-31'
    });

    if (openingRes.data.success && openingRes.data.data) {
      const records = openingRes.data.data;
      console.log(`\n📦 Opening Balance Records (before Sept 1): ${records.length} records`);
      
      const totalQty = records.reduce((sum, r) => {
        const qty = Number(r.qty || 0);
        return r.movement_type === 'IN' ? sum + qty : sum - qty;
      }, 0);
      
      console.log(`   Calculated opening balance: ${totalQty}`);
      
      if (records.length > 0) {
        console.log(`   Dates: ${records.map(r => r.date).join(', ')}`);
      }
    }

    // Get summary
    const summaryRes = await getSummaries(2025, 9);
    
    if (summaryRes.data.success && summaryRes.data.data) {
      const summary = summaryRes.data.data.find(s => s.item_type === 'MATERIAL' && s.fk_id === 1);
      
      if (summary) {
        console.log(`\n📊 Monthly Summary for MATERIAL ID=1:`);
        console.log(`   Opening Qty: ${summary.opening_qty}`);
        console.log(`   IN Qty: ${summary.in_qty}`);
        console.log(`   OUT Qty: ${summary.out_qty}`);
        console.log(`   Closing Qty: ${summary.closing_qty}`);
        console.log(`   Formula: ${summary.opening_qty} + ${summary.in_qty} - ${summary.out_qty} = ${Number(summary.opening_qty) + Number(summary.in_qty) - Number(summary.out_qty)} (should be ${summary.closing_qty})`);
      }
    }

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(100));
  console.log('\n✅ Verification complete!\n');
  process.exit(0);
};

run();
