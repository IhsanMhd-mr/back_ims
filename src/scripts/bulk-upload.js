#!/usr/bin/env node
import sequelize from '../config/db.js';
import bcrypt from 'bcrypt';
import { User } from '../models/user.model.js';
import { Product } from '../models/product.model.js';
import { Stock } from '../models/stock.model.js';
import { Material } from '../models/mat.model.js';
import { Sale } from '../models/sale.model.js';
import { Bill } from '../models/bill.model.js';
import { ItemSale } from '../models/item-sale.model.js';

const ensureCount = async (Model, makeFn, name, target = 5) => {
  const count = await Model.count();
  let created = 0;
  for (let i = count + 1; i <= target; i++) {
    const data = makeFn(i);
    await Model.create(data);
    created++;
  }
  console.log(`${name}: had ${count} rows, created ${created} new rows`);
};

const run = async () => {
  try {
    console.log('Connecting to DB...');
    await sequelize.authenticate();
    console.log('Syncing models (no destructive sync)...');
    await sequelize.sync();

    // Users
    await ensureCount(User, (i) => ({
      email: `user${i}@example.com`,
      password: bcrypt.hashSync(`pass${i}`, 8),
      first_name: `First${i}`,
      last_name: `Last${i}`,
      contact_number: `0100000${String(i).padStart(2, '0')}`
    }), 'User');

    // Products
    await ensureCount(Product, (i) => ({
      sku: `P-${String(i).padStart(3, '0')}`,
      name: `Product ${i}`,
      description: `Sample product ${i}`,
      cost: (5 * i).toFixed(2),
      mrp: (6 * i).toFixed(2),
      date: new Date().toISOString().split('T')[0],
      quantity: i,
      unit: 'pcs'
    }), 'Product');

    // Materials
    await ensureCount(Material, (i) => ({
      name: `Material ${i}`,
      description: `Sample material ${i}`,
      price: (2.5 * i).toFixed(2),
      date: new Date().toISOString().split('T')[0],
      qty: 10 * i,
      unit: 'kg'
    }), 'Material');

    // Stocks (reference products)
    const products = await Product.findAll({ limit: 5, order: [['id', 'ASC']] });
    const stockCount = await Stock.count();
    let createdStock = 0;
    for (let i = stockCount + 1; i <= 5; i++) {
      const prod = products[(i - 1) % products.length];
      await Stock.create({
        product_id: prod.id,
        description: `Initial stock for ${prod.name}`,
        price: prod.mrp,
        date: new Date().toISOString().split('T')[0],
        qty: 20 * i,
        unit: 'pcs'
      });
      createdStock++;
    }
    console.log(`Stock: had ${stockCount} rows, created ${createdStock} new rows`);

    // Sales (simple sales entries with items JSON)
    await ensureCount(Sale, (i) => ({
      date: new Date().toISOString().split('T')[0],
      total: (10 * i).toFixed(2),
      items: JSON.stringify([{ product_id: products[0].id, qty: i, unit_price: (10).toFixed(2) }]),
      customer: `Customer ${i}`
    }), 'Sale');

    // Bills and items
    const billCount = await Bill.count();
    let createdBills = 0;
    for (let i = billCount + 1; i <= 5; i++) {
      const bill = await Bill.create({
        bill_number: `BULK-${Date.now()}-${i}`,
        customer_name: `Bulk Customer ${i}`,
        date: new Date(),
        total_amount: 0,
        status: 'pending'
      });
      // create an item for the bill referencing a product
      const prod = products[(i - 1) % products.length];
      await ItemSale.create({
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        variant_id: prod.variant_id,
        quantity: 1,
        unit_price: parseFloat(prod.mrp || 0),
        subtotal: parseFloat(prod.mrp || 0),
        bill_id: bill.id
      });
      createdBills++;
    }
    console.log(`Bills: had ${billCount} rows, created ${createdBills} new rows`);

    console.log('Bulk upload complete');
    process.exit(0);
  } catch (err) {
    console.error('Bulk upload failed:', err);
    process.exit(1);
  }
};

run();
