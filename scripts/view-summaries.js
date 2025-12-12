/**
 * View monthly summaries
 * Query and display the generated summaries
 */

import http from 'http';

const API_BASE = 'localhost';
const API_PORT = 3000;

const getSummaries = (year, month) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      port: API_PORT,
      path: `/stock/monthly-summaries?year=${year}&month=${month}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
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

const formatValue = (val) => {
  if (val === null || val === undefined) return '-';
  return Number(val).toFixed(2);
};

const run = async () => {
  console.log('📊 Monthly Summary Report\n');
  console.log('='.repeat(120));

  const months = [
    { year: 2025, month: 9 },
    { year: 2025, month: 10 },
    { year: 2025, month: 12 }
  ];

  for (const m of months) {
    const monthLabel = `${m.year}-${String(m.month).padStart(2, '0')}`;
    console.log(`\n📅 ${monthLabel}`);
    console.log('-'.repeat(120));

    try {
      const result = await getSummaries(m.year, m.month);
      
      if (result.data.success && result.data.data) {
        const summaries = result.data.data;
        
        if (summaries.length === 0) {
          console.log('   No summaries found for this month.');
          continue;
        }

        console.log(`   Found ${summaries.length} items\n`);

        // Group by item type
        const materials = summaries.filter(s => s.item_type === 'MATERIAL');
        const products = summaries.filter(s => s.item_type === 'PRODUCT');

        if (materials.length > 0) {
          console.log('   📦 MATERIALS:');
          console.log('   ' + '-'.repeat(116));
          materials.forEach(s => {
            console.log(`   ${s.item_name?.padEnd(25) || 'Unknown'.padEnd(25)} | ` +
              `Open: ${String(s.opening_qty || 0).padStart(5)} (${formatValue(s.opening_value).padStart(10)}) | ` +
              `IN: ${String(s.in_qty || 0).padStart(5)} (${formatValue(s.in_value).padStart(10)}) | ` +
              `OUT: ${String(s.out_qty || 0).padStart(5)} (${formatValue(s.out_value).padStart(10)}) | ` +
              `Close: ${String(s.closing_qty || 0).padStart(5)} (${formatValue(s.closing_value).padStart(10)})`
            );
          });
          console.log('');
        }

        if (products.length > 0) {
          console.log('   📦 PRODUCTS:');
          console.log('   ' + '-'.repeat(116));
          products.forEach(s => {
            console.log(`   ${s.item_name?.padEnd(25) || 'Unknown'.padEnd(25)} | ` +
              `Open: ${String(s.opening_qty || 0).padStart(5)} (${formatValue(s.opening_value).padStart(10)}) | ` +
              `IN: ${String(s.in_qty || 0).padStart(5)} (${formatValue(s.in_value).padStart(10)}) | ` +
              `OUT: ${String(s.out_qty || 0).padStart(5)} (${formatValue(s.out_value).padStart(10)}) | ` +
              `Close: ${String(s.closing_qty || 0).padStart(5)} (${formatValue(s.closing_value).padStart(10)})`
            );
          });
          console.log('');
        }

      } else {
        console.log(`   ❌ Error: ${result.data.message || 'Failed to fetch summaries'}`);
      }

    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
  }

  console.log('='.repeat(120));
  console.log('\n✅ Report complete!\n');
  process.exit(0);
};

run();
