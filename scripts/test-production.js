/**
 * Production Feature Test Script
 * 
 * This script tests all production endpoints to ensure they work correctly.
 * Run this after starting the backend server.
 * 
 * Usage: node backend/scripts/test-production.js
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

async function testEndpoint(method, endpoint, data = null) {
  const url = `${API_BASE}${endpoint}`;
  console.log(`\n🔄 Testing: ${method} ${endpoint}`);
  
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));
      return result;
    } else {
      console.log('❌ Failed:', response.status);
      console.log('Error:', JSON.stringify(result, null, 2));
      return null;
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🏭 Production Feature Test Suite');
  console.log('================================\n');
  console.log(`API Base: ${API_BASE}`);
  
  // Test 1: Get available templates
  console.log('\n📋 Test 1: Get Available Templates');
  const templatesResult = await testEndpoint('GET', '/production/templates');
  
  if (!templatesResult || !templatesResult.data || templatesResult.data.length === 0) {
    console.log('\n⚠️  Warning: No templates found. Please create templates in Conversion module first.');
    return;
  }
  
  const template1 = templatesResult.data[0];
  console.log(`\n✓ Found ${templatesResult.data.length} template(s)`);
  console.log(`  - First template: "${template1.template_name}" (ID: ${template1.id})`);
  
  // Test 2: Calculate requirements
  console.log('\n📊 Test 2: Calculate Requirements');
  const productionPlan = [
    { template_id: template1.id, quantity: 2 }
  ];
  
  if (templatesResult.data.length > 1) {
    const template2 = templatesResult.data[1];
    productionPlan.push({ template_id: template2.id, quantity: 1 });
  }
  
  const calcResult = await testEndpoint('POST', '/production/calculate', {
    production_plan: productionPlan
  });
  
  if (calcResult && calcResult.data) {
    console.log(`\n✓ Calculation completed`);
    console.log(`  - Materials required: ${calcResult.data.materials?.length || 0}`);
    console.log(`  - Products to produce: ${calcResult.data.products?.length || 0}`);
    console.log(`  - Feasible: ${calcResult.data.feasible ? '✅ Yes' : '❌ No (insufficient materials)'}`);
    
    if (calcResult.data.materials && calcResult.data.materials.length > 0) {
      console.log('\n  Material Details:');
      calcResult.data.materials.forEach((m, i) => {
        console.log(`    ${i + 1}. ${m.item_name || m.sku}`);
        console.log(`       Required: ${m.required} ${m.unit}`);
        console.log(`       Available: ${m.available} ${m.unit}`);
        console.log(`       Status: ${m.feasible ? '✅ OK' : `❌ Short (${m.shortage} ${m.unit})`}`);
      });
    }
  }
  
  // Test 3: Execute production (only if feasible and user confirms)
  if (calcResult && calcResult.data && calcResult.data.feasible) {
    console.log('\n🚀 Test 3: Execute Production');
    console.log('⚠️  This will modify stock levels!');
    console.log('Run with --execute flag to actually execute production.');
    
    if (process.argv.includes('--execute')) {
      const execResult = await testEndpoint('POST', '/production/execute', {
        production_plan: productionPlan,
        notes: 'Test production run via test script'
      });
      
      if (execResult && execResult.data) {
        console.log(`\n✓ Production executed successfully!`);
        console.log(`  - Production Ref: ${execResult.data.production_ref}`);
        console.log(`  - Materials consumed: ${execResult.data.materials_consumed}`);
        console.log(`  - Products produced: ${execResult.data.products_produced}`);
        console.log(`  - Movements created: ${execResult.data.movements_created}`);
      }
    } else {
      console.log('Skipped (add --execute flag to run)');
    }
  } else {
    console.log('\n⏭️  Skipping Test 3: Production execution (not feasible or calculation failed)');
  }
  
  // Test 4: Get production history
  console.log('\n📜 Test 4: Get Production History');
  const historyResult = await testEndpoint('GET', '/production/history?limit=5');
  
  if (historyResult && historyResult.data) {
    console.log(`\n✓ History retrieved`);
    console.log(`  - Total batches: ${historyResult.total || 0}`);
    console.log(`  - Batches returned: ${historyResult.data.length}`);
    
    if (historyResult.data.length > 0) {
      console.log('\n  Recent batches:');
      historyResult.data.forEach((batch, i) => {
        console.log(`    ${i + 1}. ${batch.production_ref}`);
        console.log(`       Date: ${new Date(batch.date).toLocaleString()}`);
        console.log(`       Templates: ${batch.templates?.length || 0}`);
        console.log(`       Cost: $${batch.total_cost?.toFixed(2) || '0.00'}`);
      });
    } else {
      console.log('  No production history found yet.');
    }
  }
  
  console.log('\n\n✅ Test suite completed!');
  console.log('\nNext steps:');
  console.log('1. Start frontend: cd frontend && npm run dev');
  console.log('2. Navigate to: http://localhost:5173/produce');
  console.log('3. Test the UI workflow');
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
