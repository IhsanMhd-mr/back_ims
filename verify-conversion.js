/**
 * STOCK CONVERSION SYSTEM - SETUP VERIFICATION GUIDE
 * 
 * Run this after deployment to verify everything is working
 * Usage: npm run verify-conversion (if added to package.json)
 * Or: node verify-conversion.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function verify() {
  log('\n=== STOCK CONVERSION SYSTEM - VERIFICATION ===\n', 'blue');

  const tests = [];

  try {
    // Test 1: Database Connection
    log('1. Checking database connection...', 'yellow');
    const dbTest = await makeRequest('GET', '/conversion/templates?limit=1');
    if (dbTest.status === 200 || dbTest.status === 400) {
      log('✓ Database connection OK', 'green');
      tests.push(true);
    } else {
      log(`✗ Database connection FAILED (${dbTest.status})`, 'red');
      tests.push(false);
    }
  } catch (err) {
    log(`✗ Database connection ERROR: ${err.message}`, 'red');
    tests.push(false);
  }

  try {
    // Test 2: Template CRUD
    log('\n2. Testing Template CRUD...', 'yellow');

    // Create template
    const createRes = await makeRequest('POST', '/conversion/templates', {
      template_name: `TEST-Template-${Date.now()}`,
      description: 'Test template for verification',
      inputs: [
        { sku: 'TEST-MAT-001', qty: 10, unit: 'kg' }
      ],
      outputs: [
        { sku: 'TEST-PROD-001', qty: 1, unit: 'bag' }
      ]
    });

    if (createRes.status === 201 && createRes.data.success) {
      log('  ✓ Template creation OK', 'green');
      const templateId = createRes.data.data.id;

      // Read template
      const readRes = await makeRequest('GET', `/conversion/templates/${templateId}`);
      if (readRes.status === 200 && readRes.data.success) {
        log('  ✓ Template read OK', 'green');

        // Update template
        const updateRes = await makeRequest('PUT', `/conversion/templates/${templateId}`, {
          description: 'Updated test template'
        });
        if (updateRes.status === 200 && updateRes.data.success) {
          log('  ✓ Template update OK', 'green');

          // Delete template
          const deleteRes = await makeRequest('DELETE', `/conversion/templates/${templateId}`);
          if (deleteRes.status === 200 && deleteRes.data.success) {
            log('  ✓ Template delete OK', 'green');
            tests.push(true);
          } else {
            log(`  ✗ Template delete FAILED (${deleteRes.status})`, 'red');
            tests.push(false);
          }
        } else {
          log(`  ✗ Template update FAILED (${updateRes.status})`, 'red');
          tests.push(false);
        }
      } else {
        log(`  ✗ Template read FAILED (${readRes.status})`, 'red');
        tests.push(false);
      }
    } else {
      log(`  ✗ Template creation FAILED (${createRes.status})`, 'red');
      log(`     Response: ${JSON.stringify(createRes.data)}`, 'red');
      tests.push(false);
    }
  } catch (err) {
    log(`✗ Template CRUD ERROR: ${err.message}`, 'red');
    tests.push(false);
  }

  try {
    // Test 3: Stock Check
    log('\n3. Testing Stock Check...', 'yellow');
    const stockRes = await makeRequest('GET', '/conversion/stock-check?sku=SAND-100');
    if (stockRes.status === 200) {
      log('  ✓ Stock check endpoint OK', 'green');
      log(`  Available qty: ${stockRes.data.available_qty || 'N/A'}`, 'blue');
      tests.push(true);
    } else {
      log(`  ✗ Stock check FAILED (${stockRes.status})`, 'red');
      tests.push(false);
    }
  } catch (err) {
    log(`✗ Stock check ERROR: ${err.message}`, 'red');
    tests.push(false);
  }

  try {
    // Test 4: Get Templates List
    log('\n4. Testing Get Templates List...', 'yellow');
    const listRes = await makeRequest('GET', '/conversion/templates?page=1&limit=10');
    if (listRes.status === 200 && listRes.data.success) {
      log(`  ✓ Templates list OK (${listRes.data.data?.length || 0} templates)`, 'green');
      tests.push(true);
    } else {
      log(`  ✗ Templates list FAILED (${listRes.status})`, 'red');
      tests.push(false);
    }
  } catch (err) {
    log(`✗ Templates list ERROR: ${err.message}`, 'red');
    tests.push(false);
  }

  try {
    // Test 5: Get Records List
    log('\n5. Testing Get Records List...', 'yellow');
    const recordsRes = await makeRequest('GET', '/conversion/records?page=1&limit=10');
    if (recordsRes.status === 200 && recordsRes.data.success) {
      log(`  ✓ Records list OK (${recordsRes.data.data?.length || 0} records)`, 'green');
      tests.push(true);
    } else {
      log(`  ✗ Records list FAILED (${recordsRes.status})`, 'red');
      tests.push(false);
    }
  } catch (err) {
    log(`✗ Records list ERROR: ${err.message}`, 'red');
    tests.push(false);
  }

  // Summary
  const passed = tests.filter(t => t).length;
  const total = tests.length;

  log(`\n=== VERIFICATION SUMMARY ===`, 'blue');
  log(`Passed: ${passed}/${total} tests`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n✓ All systems operational! Conversion system is ready.', 'green');
    process.exit(0);
  } else {
    log('\n✗ Some tests failed. Please review the errors above.', 'red');
    process.exit(1);
  }
}

// Run verification
verify().catch(err => {
  log(`\nFATAL ERROR: ${err.message}`, 'red');
  log('Make sure backend server is running on http://localhost:3000', 'yellow');
  process.exit(1);
});
