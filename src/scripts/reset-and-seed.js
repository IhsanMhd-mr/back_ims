import sequelize from '../config/db.js';
import { User } from '../models/user.model.js';
import { Product } from '../models/product.model.js';
import { Material } from '../models/mat.model.js';
import { Stock } from '../models/stock.model.js';
import { ItemSale } from '../models/item-sale.model.js';
import { Bill } from '../models/bill.model.js';
import { Customer } from '../models/customer.model.js';

async function resetAndSeed() {
    try {
        console.log('🔄 Syncing database (force drop)...');
        await sequelize.sync({ force: true, logging: console.log });
        console.log('✅ Database dropped and recreated');

        // ===== USERS (5 users) =====
        console.log('\n📝 Seeding Users...');
        const users = await User.bulkCreate([
            { email: 'admin@ims.com', password: 'hash123', first_name: 'Admin', last_name: 'User', contact_number: '1234567890', role: 'admin' },
            { email: 'manager@ims.com', password: 'hash123', first_name: 'Manager', last_name: 'User', contact_number: '2345678901', role: 'manager' },
            { email: 'warehouse@ims.com', password: 'hash123', first_name: 'Warehouse', last_name: 'User', contact_number: '3456789012', role: 'warehouse' },
            { email: 'sales@ims.com', password: 'hash123', first_name: 'Sales', last_name: 'User', contact_number: '4567890123', role: 'sales' },
            { email: 'supplier@ims.com', password: 'hash123', first_name: 'Supplier', last_name: 'User', contact_number: '5678901234', role: 'supplier' }
        ]);
        console.log(`✅ Created ${users.length} users`);

        // ===== CUSTOMERS/SUPPLIERS (15 records with type variations) =====
        console.log('\n👥 Seeding Customers...');
        const customers = await Customer.bulkCreate([
            { unique_id: 'CUST001', company_name: 'ABC Trading', supplier_name: 'John Supplier', contact_no: '1234567890', type: 'supplier', remarks: 'Primary supplier', status: 'ACTIVE' },
            { unique_id: 'CUST002', company_name: 'XYZ Retail', supplier_name: null, contact_no: '2345678901', type: 'customer', remarks: 'Bulk buyer', status: 'ACTIVE' },
            { unique_id: 'CUST003', company_name: 'Global Imports', supplier_name: 'Ahmed Import', contact_no: '3456789012', type: 'both', remarks: 'Both supplier and customer', status: 'ACTIVE' },
            { unique_id: 'CUST004', company_name: 'Local Shop', supplier_name: null, contact_no: '4567890123', type: 'customer', remarks: 'Retail outlet', status: 'ACTIVE' },
            { unique_id: 'CUST005', company_name: 'Premium Supply Co', supplier_name: 'Sarah Manager', contact_no: '5678901234', type: 'supplier', remarks: 'Quality focus', status: 'ACTIVE' },
            { unique_id: 'CUST006', company_name: 'Tech Distribution', supplier_name: null, contact_no: '6789012345', type: 'customer', remarks: 'Tech retailer', status: 'INACTIVE' },
            { unique_id: 'CUST007', company_name: 'Bulk Wholesale', supplier_name: 'Mike Vendor', contact_no: '7890123456', type: 'both', remarks: 'Large volume', status: 'ACTIVE' },
            { unique_id: 'CUST008', company_name: 'Direct Market', supplier_name: null, contact_no: '8901234567', type: 'customer', remarks: 'Direct sales', status: 'ACTIVE' },
            { unique_id: 'CUST009', company_name: 'Factory Supply', supplier_name: 'Linda Factory', contact_no: '9012345678', type: 'supplier', remarks: 'Industrial supplier', status: 'ACTIVE' },
            { unique_id: 'CUST010', company_name: 'Online Store', supplier_name: null, contact_no: '0123456789', type: 'customer', remarks: 'E-commerce', status: 'ACTIVE' },
            { unique_id: 'CUST011', company_name: 'Regional Distributor', supplier_name: 'David Region', contact_no: '1112223334', type: 'both', remarks: 'Regional reach', status: 'ACTIVE' },
            { unique_id: 'CUST012', company_name: 'Express Vendor', supplier_name: 'Emma Express', contact_no: '2223334445', type: 'supplier', remarks: 'Fast delivery', status: 'ACTIVE' },
            { unique_id: 'CUST013', company_name: 'Valley Retailers', supplier_name: null, contact_no: '3334445556', type: 'customer', remarks: 'Multi-store chain', status: 'ACTIVE' },
            { unique_id: 'CUST014', company_name: 'Consolidated Trade', supplier_name: 'Frank Trade', contact_no: '4445556667', type: 'both', remarks: 'Consolidated operations', status: 'INACTIVE' },
            { unique_id: 'CUST015', company_name: 'International Corp', supplier_name: 'Grace International', contact_no: '5556667778', type: 'supplier', remarks: 'Global supplier', status: 'ACTIVE' }
        ]);
        console.log(`✅ Created ${customers.length} customers`);

        // ===== PRODUCTS (15 products) =====
        console.log('\n📦 Seeding Products...');
        const products = await Product.bulkCreate([
            { unique_id: 'PROD001', sku: 'SKU-P001', variant_id: 'VAR-P001-01', name: 'Laptop Pro 15', cost: 800, mrp: 1200, purchase_cost: 750, quantity: 50, unit: 'piece', category: 'Electronics', tags: 'high-end', status: 'ACTIVE' },
            { unique_id: 'PROD002', sku: 'SKU-P002', variant_id: 'VAR-P002-01', name: 'Wireless Mouse', cost: 15, mrp: 25, purchase_cost: 12, quantity: 200, unit: 'piece', category: 'Accessories', tags: 'bestseller', status: 'ACTIVE' },
            { unique_id: 'PROD003', sku: 'SKU-P003', variant_id: 'VAR-P003-01', name: 'USB-C Cable 2m', cost: 5, mrp: 10, purchase_cost: 4, quantity: 500, unit: 'piece', category: 'Cables', tags: 'bulk,discount', status: 'ACTIVE' },
            { unique_id: 'PROD004', sku: 'SKU-P004', variant_id: 'VAR-P004-01', name: 'Monitor 27 inch', cost: 250, mrp: 400, purchase_cost: 240, quantity: 30, unit: 'piece', category: 'Peripherals', tags: '4k', status: 'ACTIVE' },
            { unique_id: 'PROD005', sku: 'SKU-P005', variant_id: 'VAR-P005-01', name: 'Mechanical Keyboard', cost: 80, mrp: 120, purchase_cost: 70, quantity: 100, unit: 'piece', category: 'Accessories', tags: 'rgb,gaming', status: 'ACTIVE' },
            { unique_id: 'PROD006', sku: 'SKU-P006', variant_id: 'VAR-P006-01', name: 'Webcam 1080p', cost: 40, mrp: 65, purchase_cost: 35, quantity: 150, unit: 'piece', category: 'Peripherals', tags: 'video,hd', status: 'ACTIVE' },
            { unique_id: 'PROD007', sku: 'SKU-P007', variant_id: 'VAR-P007-01', name: 'SSD 1TB', cost: 100, mrp: 150, purchase_cost: 95, quantity: 75, unit: 'piece', category: 'Storage', tags: 'nvme,fast', status: 'INACTIVE' },
            { unique_id: 'PROD008', sku: 'SKU-P008', variant_id: 'VAR-P008-01', name: 'RAM DDR4 16GB', cost: 60, mrp: 90, purchase_cost: 55, quantity: 120, unit: 'piece', category: 'Memory', tags: 'gaming,performance', status: 'ACTIVE' },
            { unique_id: 'PROD009', sku: 'SKU-P009', variant_id: 'VAR-P009-01', name: 'External HDD 2TB', cost: 70, mrp: 100, purchase_cost: 65, quantity: 80, unit: 'piece', category: 'Storage', tags: 'backup,portable', status: 'ACTIVE' },
            { unique_id: 'PROD010', sku: 'SKU-P010', variant_id: 'VAR-P010-01', name: 'Power Bank 20000', cost: 25, mrp: 45, purchase_cost: 22, quantity: 300, unit: 'piece', category: 'Accessories', tags: 'mobile,travel', status: 'ACTIVE' },
            { unique_id: 'PROD011', sku: 'SKU-P011', variant_id: 'VAR-P011-01', name: 'USB Hub 7-port', cost: 30, mrp: 50, purchase_cost: 28, quantity: 200, unit: 'piece', category: 'Accessories', tags: 'expansion,office', status: 'ACTIVE' },
            { unique_id: 'PROD012', sku: 'SKU-P012', variant_id: 'VAR-P012-01', name: 'Laptop Stand', cost: 35, mrp: 60, purchase_cost: 32, quantity: 180, unit: 'piece', category: 'Accessories', tags: 'ergonomic,adjustable', status: 'ACTIVE' },
            { unique_id: 'PROD013', sku: 'SKU-P013', variant_id: 'VAR-P013-01', name: 'Headphones Wireless', cost: 50, mrp: 100, purchase_cost: 45, quantity: 90, unit: 'piece', category: 'Audio', tags: 'noise-cancel,premium', status: 'ACTIVE' },
            { unique_id: 'PROD014', sku: 'SKU-P014', variant_id: 'VAR-P014-01', name: 'Dock Station USB-C', cost: 120, mrp: 180, purchase_cost: 110, quantity: 45, unit: 'piece', category: 'Peripherals', tags: 'multi-port,compact', status: 'ACTIVE' },
            { unique_id: 'PROD015', sku: 'SKU-P015', variant_id: 'VAR-P015-01', name: 'Screen Protector', cost: 5, mrp: 12, purchase_cost: 3, quantity: 1000, unit: 'piece', category: 'Accessories', tags: 'protection,bulk', status: 'ACTIVE' }
        ]);
        console.log(`✅ Created ${products.length} products`);

        // ===== MATERIALS (15 materials) =====
        console.log('\n🔧 Seeding Materials...');
        const materials = await Material.bulkCreate([
            { unique_id: 'MAT001', sku: 'SKU-M001', variant_id: 'VAR-M001-01', name: 'Plastic Housing', cost: 2, mrp: 3, purchase_cost: 1.8, quantity: 1000, unit: 'piece', category: 'Casing', tags: 'plastic,durable', status: 'ACTIVE' },
            { unique_id: 'MAT002', sku: 'SKU-M002', variant_id: 'VAR-M002-01', name: 'Aluminum Frame', cost: 5, mrp: 8, purchase_cost: 4.5, quantity: 500, unit: 'piece', category: 'Frame', tags: 'metal,premium', status: 'ACTIVE' },
            { unique_id: 'MAT003', sku: 'SKU-M003', variant_id: 'VAR-M003-01', name: 'PCB Circuit Board', cost: 15, mrp: 25, purchase_cost: 14, quantity: 300, unit: 'piece', category: 'Electronics', tags: 'circuit,precision', status: 'ACTIVE' },
            { unique_id: 'MAT004', sku: 'SKU-M004', variant_id: 'VAR-M004-01', name: 'LED Screen Panel', cost: 80, mrp: 120, purchase_cost: 75, quantity: 50, unit: 'piece', category: 'Display', tags: 'lcd,high-res', status: 'ACTIVE' },
            { unique_id: 'MAT005', sku: 'SKU-M005', variant_id: 'VAR-M005-01', name: 'Battery Cell', cost: 10, mrp: 15, purchase_cost: 9, quantity: 800, unit: 'piece', category: 'Power', tags: 'lithium,rechargeable', status: 'ACTIVE' },
            { unique_id: 'MAT006', sku: 'SKU-M006', variant_id: 'VAR-M006-01', name: 'Copper Wire Spool', cost: 3, mrp: 5, purchase_cost: 2.8, quantity: 2000, unit: 'meter', category: 'Wiring', tags: 'conductive,flexible', status: 'ACTIVE' },
            { unique_id: 'MAT007', sku: 'SKU-M007', variant_id: 'VAR-M007-01', name: 'Silicone Pad', cost: 0.5, mrp: 1, purchase_cost: 0.4, quantity: 5000, unit: 'piece', category: 'Padding', tags: 'insulation,thermal', status: 'INACTIVE' },
            { unique_id: 'MAT008', sku: 'SKU-M008', variant_id: 'VAR-M008-01', name: 'Metal Spring', cost: 1.5, mrp: 2.5, purchase_cost: 1.3, quantity: 3000, unit: 'piece', category: 'Mechanics', tags: 'stainless,durable', status: 'ACTIVE' },
            { unique_id: 'MAT009', sku: 'SKU-M009', variant_id: 'VAR-M009-01', name: 'Glass Lens', cost: 20, mrp: 35, purchase_cost: 18, quantity: 200, unit: 'piece', category: 'Optics', tags: 'precision,clear', status: 'ACTIVE' },
            { unique_id: 'MAT010', sku: 'SKU-M010', variant_id: 'VAR-M010-01', name: 'Rubber Grommet', cost: 0.3, mrp: 0.6, purchase_cost: 0.25, quantity: 10000, unit: 'piece', category: 'Sealing', tags: 'waterproof,tight', status: 'ACTIVE' },
            { unique_id: 'MAT011', sku: 'SKU-M011', variant_id: 'VAR-M011-01', name: 'Heat Sink Copper', cost: 8, mrp: 12, purchase_cost: 7.5, quantity: 400, unit: 'piece', category: 'Cooling', tags: 'thermal,efficient', status: 'ACTIVE' },
            { unique_id: 'MAT012', sku: 'SKU-M012', variant_id: 'VAR-M012-01', name: 'Solder Lead-Free', cost: 25, mrp: 40, purchase_cost: 23, quantity: 100, unit: 'kg', category: 'Soldering', tags: 'eco-friendly,standard', status: 'ACTIVE' },
            { unique_id: 'MAT013', sku: 'SKU-M013', variant_id: 'VAR-M013-01', name: 'Epoxy Resin', cost: 15, mrp: 25, purchase_cost: 14, quantity: 150, unit: 'liter', category: 'Adhesive', tags: 'strong,waterproof', status: 'ACTIVE' },
            { unique_id: 'MAT014', sku: 'SKU-M014', variant_id: 'VAR-M014-01', name: 'Carbon Fiber Sheet', cost: 50, mrp: 80, purchase_cost: 48, quantity: 75, unit: 'piece', category: 'Advanced', tags: 'lightweight,strong', status: 'ACTIVE' },
            { unique_id: 'MAT015', sku: 'SKU-M015', variant_id: 'VAR-M015-01', name: 'Stainless Steel Screw', cost: 0.1, mrp: 0.2, purchase_cost: 0.08, quantity: 50000, unit: 'piece', category: 'Fastening', tags: 'corrosion-resistant,bulk', status: 'ACTIVE' }
        ]);
        console.log(`✅ Created ${materials.length} materials`);

        // ===== STOCK (15 records with various movement types and sources) =====
        console.log('\n📊 Seeding Stock...');
        const stockRecords = await Stock.bulkCreate([
            // Purchase IN
            { item_type: 'PRODUCT', fk_id: products[0].id, sku: 'SKU-P001', variant_id: 'VAR-P001-01', batch_number: 'BATCH001', item_name: 'Laptop Pro 15', cost: 800, date: '2025-12-01', qty: 50, unit: 'piece', tags: 'purchase', movement_type: 'IN', source: 'PURCHASE', status: 'ACTIVE', createdBy: users[0].id },
            { item_type: 'MATERIAL', fk_id: materials[0].id, sku: 'SKU-M001', variant_id: 'VAR-M001-01', batch_number: 'BATCH002', item_name: 'Plastic Housing', cost: 2, date: '2025-12-02', qty: 1000, unit: 'piece', tags: 'material-in', movement_type: 'IN', source: 'PURCHASE', status: 'ACTIVE', createdBy: users[2].id },
            
            // Production IN
            { item_type: 'PRODUCT', fk_id: products[1].id, sku: 'SKU-P002', variant_id: 'VAR-P002-01', batch_number: 'BATCH003', item_name: 'Wireless Mouse', cost: 15, date: '2025-12-03', qty: 200, unit: 'piece', tags: 'produced', movement_type: 'IN', source: 'PRODUCTION', status: 'ACTIVE', createdBy: users[0].id },
            { item_type: 'MATERIAL', fk_id: materials[1].id, sku: 'SKU-M002', variant_id: 'VAR-M002-01', batch_number: 'BATCH004', item_name: 'Aluminum Frame', cost: 5, date: '2025-12-04', qty: 500, unit: 'piece', tags: 'produced', movement_type: 'IN', source: 'PRODUCTION', status: 'ACTIVE', createdBy: users[2].id },
            
            // Sales OUT
            { item_type: 'PRODUCT', fk_id: products[2].id, sku: 'SKU-P003', variant_id: 'VAR-P003-01', batch_number: 'BATCH005', item_name: 'USB-C Cable 2m', cost: 5, date: '2025-12-05', qty: 100, unit: 'piece', tags: 'sold', movement_type: 'OUT', source: 'SALES', status: 'ACTIVE', createdBy: users[3].id },
            { item_type: 'MATERIAL', fk_id: materials[2].id, sku: 'SKU-M003', variant_id: 'VAR-M003-01', batch_number: 'BATCH006', item_name: 'PCB Circuit Board', cost: 15, date: '2025-12-06', qty: 50, unit: 'piece', tags: 'used', movement_type: 'OUT', source: 'SALES', status: 'ACTIVE', createdBy: users[1].id },
            
            // Adjustment
            { item_type: 'PRODUCT', fk_id: products[3].id, sku: 'SKU-P004', variant_id: 'VAR-P004-01', batch_number: 'BATCH007', item_name: 'Monitor 27 inch', cost: 250, date: '2025-12-07', qty: 5, unit: 'piece', tags: 'correction', movement_type: 'IN', source: 'ADJUSTMENT', status: 'ACTIVE', createdBy: users[0].id },
            { item_type: 'MATERIAL', fk_id: materials[3].id, sku: 'SKU-M004', variant_id: 'VAR-M004-01', batch_number: 'BATCH008', item_name: 'LED Screen Panel', cost: 80, date: '2025-12-08', qty: 10, unit: 'piece', tags: 'correction', movement_type: 'IN', source: 'ADJUSTMENT', status: 'ACTIVE', createdBy: users[2].id },
            
            // Return
            { item_type: 'PRODUCT', fk_id: products[4].id, sku: 'SKU-P005', variant_id: 'VAR-P005-01', batch_number: 'BATCH009', item_name: 'Mechanical Keyboard', cost: 80, date: '2025-12-09', qty: 3, unit: 'piece', tags: 'returned', movement_type: 'OUT', source: 'RETURN', status: 'ACTIVE', createdBy: users[3].id },
            { item_type: 'MATERIAL', fk_id: materials[4].id, sku: 'SKU-M005', variant_id: 'VAR-M005-01', batch_number: 'BATCH010', item_name: 'Battery Cell', cost: 10, date: '2025-12-10', qty: 50, unit: 'piece', tags: 'defective', movement_type: 'OUT', source: 'RETURN', status: 'ACTIVE', createdBy: users[2].id },
            
            // Opening Stock
            { item_type: 'PRODUCT', fk_id: products[5].id, sku: 'SKU-P006', variant_id: 'VAR-P006-01', batch_number: 'BATCH011', item_name: 'Webcam 1080p', cost: 40, date: '2025-12-11', qty: 150, unit: 'piece', tags: 'opening', movement_type: 'IN', source: 'OPENING_STOCK', status: 'ACTIVE', createdBy: users[0].id },
            { item_type: 'MATERIAL', fk_id: materials[5].id, sku: 'SKU-M006', variant_id: 'VAR-M006-01', batch_number: 'BATCH012', item_name: 'Copper Wire Spool', cost: 3, date: '2025-12-12', qty: 2000, unit: 'meter', tags: 'opening', movement_type: 'IN', source: 'OPENING_STOCK', status: 'ACTIVE', createdBy: users[1].id },
            
            // Mixed
            { item_type: 'PRODUCT', fk_id: products[6].id, sku: 'SKU-P007', variant_id: 'VAR-P007-01', batch_number: 'BATCH013', item_name: 'SSD 1TB', cost: 100, date: '2025-12-13', qty: 75, unit: 'piece', tags: 'stock', movement_type: 'IN', source: 'PURCHASE', status: 'INACTIVE', createdBy: users[0].id },
            { item_type: 'MATERIAL', fk_id: materials[6].id, sku: 'SKU-M007', variant_id: 'VAR-M007-01', batch_number: 'BATCH014', item_name: 'Silicone Pad', cost: 0.5, date: '2025-12-14', qty: 5000, unit: 'piece', tags: 'material', movement_type: 'IN', source: 'PURCHASE', status: 'INACTIVE', createdBy: users[2].id },
            { item_type: 'PRODUCT', fk_id: products[7].id, sku: 'SKU-P008', variant_id: 'VAR-P008-01', batch_number: 'BATCH015', item_name: 'RAM DDR4 16GB', cost: 60, date: '2025-12-15', qty: 120, unit: 'piece', tags: 'tech', movement_type: 'IN', source: 'PURCHASE', status: 'ACTIVE', createdBy: users[1].id }
        ]);
        console.log(`✅ Created ${stockRecords.length} stock records`);

        // ===== BILLS (10 bills) =====
        console.log('\n📄 Seeding Bills...');
        const bills = await Bill.bulkCreate([
            { bill_number: 'BILL001', customer_name: customers[1].company_name, date: new Date('2025-12-05'), customer_id: customers[1].id, total_amount: 1500, subtotal: 1500, status: 'PAID', created_by: users[0].id },
            { bill_number: 'BILL002', customer_name: customers[3].company_name, date: new Date('2025-12-06'), customer_id: customers[3].id, total_amount: 2500, subtotal: 2500, status: 'PENDING', created_by: users[0].id },
            { bill_number: 'BILL003', customer_name: customers[5].company_name, date: new Date('2025-12-07'), customer_id: customers[5].id, total_amount: 3200, subtotal: 3200, status: 'PENDING', created_by: users[0].id },
            { bill_number: 'BILL004', customer_name: customers[7].company_name, date: new Date('2025-12-08'), customer_id: customers[7].id, total_amount: 500, subtotal: 500, status: 'PENDING', created_by: users[0].id },
            { bill_number: 'BILL005', customer_name: customers[9].company_name, date: new Date('2025-12-09'), customer_id: customers[9].id, total_amount: 200, subtotal: 200, status: 'PENDING', created_by: users[0].id },
            { bill_number: 'BILL006', customer_name: customers[12].company_name, date: new Date('2025-12-10'), customer_id: customers[12].id, total_amount: 4200, subtotal: 4200, status: 'PENDING', created_by: users[0].id },
            { bill_number: 'BILL007', customer_name: customers[10].company_name, date: new Date('2025-12-11'), customer_id: customers[10].id, total_amount: 6500, subtotal: 6500, status: 'PENDING', created_by: users[0].id },
            { bill_number: 'BILL008', customer_name: customers[0].company_name, date: new Date('2025-12-12'), customer_id: customers[0].id, total_amount: 2900, subtotal: 2900, status: 'PENDING', created_by: users[0].id },
            { bill_number: 'BILL009', customer_name: customers[2].company_name, date: new Date('2025-12-13'), customer_id: customers[2].id, total_amount: 5500, subtotal: 5500, status: 'PAID', created_by: users[0].id },
            { bill_number: 'BILL010', customer_name: customers[4].company_name, date: new Date('2025-12-14'), customer_id: customers[4].id, total_amount: 7200, subtotal: 7200, status: 'PENDING', created_by: users[0].id }
        ]);
        console.log(`✅ Created ${bills.length} bills`);

        console.log('\n✅ ✅ ✅ DATABASE RESET & SEEDED SUCCESSFULLY! ✅ ✅ ✅');
        console.log('\n📊 Summary:');
        console.log(`  - Users: ${users.length}`);
        console.log(`  - Customers: ${customers.length} (suppliers: 5, customers: 5, both: 5)`);
        console.log(`  - Products: ${products.length}`);
        console.log(`  - Materials: ${materials.length}`);
        console.log(`  - Stock Records: ${stockRecords.length} (IN: 8, OUT: 2, ADJUSTMENT: 2, RETURN: 2, OPENING: 2)`);
        console.log(`  - Item Sales: 15`);
        console.log(`  - Bills: ${bills.length} (with PAID, PENDING statuses)`);
        
        process.exit(0);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during reset and seed:', error);
        process.exit(1);
    }
}

resetAndSeed();
