/**
 * Generate monthly summaries for the test data
 * Calls the API to aggregate stock movements into monthly summaries
 */

import http from 'http';

const API_BASE = 'localhost';
const API_PORT = 3000;

const generateSummary = (year, month) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ year, month });
    
    const options = {
      hostname: API_BASE,
      port: API_PORT,
      path: '/stock/monthly-summaries/generate-from-last-month',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
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
    req.write(postData);
    req.end();
  });
};

const run = async () => {
  console.log('📊 Generating Monthly Summaries...\n');

  const months = [
    { year: 2025, month: 9 },
    { year: 2025, month: 10 },
    { year: 2025, month: 12 }
  ];

  for (const m of months) {
    console.log(`🔄 Generating summary for ${m.year}-${String(m.month).padStart(2, '0')}...`);
    try {
      const result = await generateSummary(m.year, m.month);
      console.log(`   Status: ${result.status}`);
      if (result.data.success) {
        console.log(`   ✅ Created ${result.data.count || 0} summary records`);
      } else {
        console.log(`   ❌ Error: ${result.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
    console.log('');
  }

  console.log('✅ All summaries generated!\n');
  console.log('🌐 View in frontend:');
  console.log('   Navigate to Stock page → Click "Summary (Last Month)" button\n');
  process.exit(0);
};

run();
