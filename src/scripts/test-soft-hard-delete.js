import sequelize from '../config/db.js';
import { Bill } from '../models/bill.model.js';
import { ItemSale } from '../models/item-sale.model.js';
// Ensure associations are initialized when running this script directly
import '../models/associations.js';
import { BillRepo } from '../repositories/bill.repository.js';

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    // Ensure models synced (no destructive actions)
    await sequelize.sync({ alter: false });

    // Create bill
    const bill_number = `TEST-BILL-${Date.now()}`;
    const bill = await Bill.create({
      bill_number,
      customer_name: 'SoftDelete Tester',
      subtotal: 10.0,
      total_amount: 10.0,
      status: 'PENDING'
    });
    console.log('Created bill id=', bill.id);

    // Create item
    const item = await ItemSale.create({
      bill_id: bill.id,
      product_id: 9999,
      product_name: 'Test Product',
      sku: 'TP-1',
      quantity: 1,
      unit_price: 10.0,
      subtotal: 10.0
    });
    console.log('Created item id=', item.id);

    // Soft-delete (default) with deleted_by=123
    console.log('\nPerforming soft delete (deleted_by=123)...');
    const soft = await BillRepo.deleteBill(bill.id, { deleted_by: 123, force: false });
    console.log('Soft delete result:', soft);

    // Fetch with paranoid disabled to inspect deleted_at
    const billRaw = await Bill.findByPk(bill.id, { paranoid: false, include: [{ model: ItemSale, as: 'items' }] });
    console.log('Bill (paranoid=false):', {
      id: billRaw.id,
      bill_number: billRaw.bill_number,
      deleted_at: billRaw.deletedAt || billRaw.deleted_at,
      deleted_by: billRaw.deleted_by
    });

    const itemsRaw = await ItemSale.findAll({ where: { bill_id: bill.id }, paranoid: false });
    console.log('Items (paranoid=false):', itemsRaw.map(i => ({ id: i.id, deleted_at: i.deletedAt || i.deleted_at, deleted_by: i.deleted_by })));

    // Hard delete
    console.log('\nPerforming hard delete (force=true)...');
    const hard = await BillRepo.deleteBill(bill.id, { force: true });
    console.log('Hard delete result:', hard);

    const afterBill = await Bill.findByPk(bill.id, { paranoid: false });
    console.log('After hard-delete, bill exists?', !!afterBill);

    const afterItems = await ItemSale.findAll({ where: { bill_id: bill.id }, paranoid: false });
    console.log('After hard-delete, items count:', afterItems.length);

    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

run();
