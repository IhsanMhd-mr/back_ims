import createExcelFile from './excel.js';

// Test the Excel generator
async function testExcelGeneration() {
    console.log('🧪 Testing Excel File Generation...\n');

    // Define columns with different data types
    const columns = [
        { header: 'ID', key: 'id', width: 10, datatype: 'number' },
        { header: 'SKU', key: 'sku', width: 15, datatype: 'string' },
        { header: 'Item Name', key: 'item_name', width: 25, datatype: 'string' },
        { header: 'Quantity', key: 'qty', width: 12, datatype: 'decimal' },
        { header: 'Cost', key: 'cost', width: 15, datatype: 'currency' },
        { header: 'Date', key: 'date', width: 15, datatype: 'date' },
        { header: 'Created At', key: 'created_at', width: 20, datatype: 'datetime' }
    ];

    // Sample data
    const data = [
        { 
            id: 1, 
            sku: 'PROD0001', 
            item_name: 'JD', 
            qty: 120, 
            cost: 50.00, 
            date: new Date(2025, 8, 15), 
            created_at: new Date() 
        },
        { 
            id: 2, 
            sku: 'MAT0004', 
            item_name: 'SWD', 
            qty: 375, 
            cost: 27.50, 
            date: new Date(2025, 10, 20), 
            created_at: new Date() 
        },
        { 
            id: 3, 
            sku: 'PROD0002', 
            item_name: 'Widget A', 
            qty: 250.75, 
            cost: 125.99, 
            date: new Date(2025, 11, 10), 
            created_at: new Date() 
        }
    ];

    try {
        const filename = './test-stock-export.xlsx';
        await createExcelFile(columns, data, filename, 'Stock Data');
        console.log('✅ Test completed successfully!');
        console.log(`📄 Check the generated file: ${filename}`);
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test
testExcelGeneration();
