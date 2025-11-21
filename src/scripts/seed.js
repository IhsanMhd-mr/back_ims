#!/usr/bin/env node
import sequelize from '../config/db.js';
import bcrypt from 'bcrypt';
import { User } from '../models/user.model.js';
import { Product } from '../models/product.model.js';
import { Stock } from '../models/stock.model.js';
import { Biller } from '../models/bill.model.js';
import { Item } from '../models/item-sale.model.js';

const seed = async () => {
  try {
    console.log('Testing DB connection...');
    await sequelize.authenticate();
    console.log('DB connected. Syncing models...');
    await sequelize.sync();

    // Users
    const userCount = await User.count();
    if (userCount === 0) {
      const pass = await bcrypt.hash('password123', 10);
      await User.create({
        email: 'admin@example.com',
        password: pass,
        first_name: 'Admin',
        last_name: 'User',
        contact_number: '0000000000',
        role: 'admin'
      });
      await User.create({
        email: 'user@example.com',
        password: await bcrypt.hash('userpass', 10),
        first_name: 'Normal',
        last_name: 'User',
        contact_number: '0111111111'
      });
      console.log('Created sample users');
    } else {
      console.log('Users exist, skipping user seed');
    }

    // Products
    const productCount = await Product.count();
    let p1, p2;
    if (productCount === 0) {
  p1 = await Product.create({ sku: 'P-001', name: 'Widget A', description: 'Sample widget', cost: '10.00', mrp: '12.00', date: new Date().toISOString().split('T')[0], quantity: 1, unit: 'pcs' });
  p2 = await Product.create({ sku: 'P-002', name: 'Gadget B', description: 'Sample gadget', cost: '20.00', mrp: '24.00', date: new Date().toISOString().split('T')[0], quantity: 2, unit: 'pcs' });
      console.log('Created sample products');
    } else {
      p1 = await Product.findOne();
      console.log('Products exist, skipping product seed');
    }

    // Stock
    const stockCount = await Stock.count();
    if (stockCount === 0) {
      await Stock.create({ product_id: p1.id, description: 'Initial stock for Widget A', price: p1.mrp, date: new Date().toISOString().split('T')[0], qty: 100, unit: 'pcs' });
      await Stock.create({ product_id: p2.id, description: 'Initial stock for Gadget B', price: p2.mrp, date: new Date().toISOString().split('T')[0], qty: 50, unit: 'pcs' });
      console.log('Created sample stock entries');
    } else {
      console.log('Stock exist, skipping stock seed');
    }

    // Bills + Items
    const billCount = await Biller.count();
    if (billCount === 0) {
      const bill = await Biller.create({
        name: 'Seed Invoice 1',
        description: 'Invoice created by seed script',
        date: new Date().toISOString().split('T')[0],
        cost: '0.00',
        discount: '0.00',
        price: '44.00',
        discount_perc: '0',
        item_qty: 2,
        contact_number: '0000000000',
        customer_id: null,
        seller_id: null
      });

      await Item.bulkCreate([
        { name: p1.name, description: p1.description, date: new Date(), cost: p1.cost, mrp: p1.mrp, qty: 1, unit: p1.unit, biller_id: bill.id },
        { name: p2.name, description: p2.description, date: new Date(), cost: p2.cost, mrp: p2.mrp, qty: 1, unit: p2.unit, biller_id: bill.id }
      ]);
      console.log('Created sample bill and items');
    } else {
      console.log('Bills exist, skipping bill seed');
    }

    console.log('Seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed', err);
    process.exit(1);
  }
};

seed();
