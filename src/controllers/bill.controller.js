import sequelize from '../config/db.js';
import { Product } from '../models/product.model.js';
import { Bill } from '../models/bill.model.js';
import { ItemSale } from '../models/item-sale.model.js';
import { BillRepo } from '../repositories/bill.repository.js';

const BillController = {
  // Create a bill from product IDs and quantities in the request body.
  // Body shape:
  // {
  //   customer_name: 'John Doe',
  //   products: [ { product_id: 17, quantity: 3 }, ... ]
  // }
  create: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { customer_name, products } = req.body || {};
      if (!customer_name) return res.status(400).json({ success: false, message: 'customer_name is required' });
      if (!Array.isArray(products) || products.length === 0) return res.status(400).json({ success: false, message: 'products array is required' });

      // fetch product details
      const productIds = products.map((p) => Number(p.product_id)).filter(Boolean);
      const dbProducts = await Product.findAll({ where: { id: productIds } });
      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      // build items and compute total with support for per-item discounts
      const itemsToCreate = [];
      let totalBeforeBillDiscount = 0;
      for (const p of products) {
        const prod = productMap.get(Number(p.product_id));
        if (!prod) {
          await t.rollback();
          return res.status(400).json({ success: false, message: `Product not found: ${p.product_id}` });
        }
        const quantity = Number(p.quantity) || 0;
        // allow overriding unit price from request (e.g., selling price)
        const unit_price = (p.unit_price !== undefined && p.unit_price !== null) ? Number(p.unit_price) : (Number(prod.mrp) ? parseFloat(prod.mrp) : 0);

        const itemDiscountPercent = Number(p.discount_percent || 0);

        const lineBefore = parseFloat((quantity * unit_price).toFixed(2));
        // apply percentage discount only
        let lineAfter = parseFloat((lineBefore * (1 - itemDiscountPercent / 100)).toFixed(2));
        if (lineAfter < 0) lineAfter = 0;

        totalBeforeBillDiscount += lineAfter;

        itemsToCreate.push({
          product_id: prod.id,
          product_name: prod.name,
          sku: prod.sku,
          variant_id: prod.variant_id,
          quantity,
          unit_price,
          discount_percent: itemDiscountPercent,
          subtotal: lineAfter,
        });
      }

      // compute bill-level discounts (percent and flat)
      const billDiscountPercent = Number(req.body.discount_percent || 0);

      let finalTotal = parseFloat((totalBeforeBillDiscount * (1 - billDiscountPercent / 100)).toFixed(2));
      if (finalTotal < 0) finalTotal = 0;

      // create bill
      const bill_number = `BILL-${Date.now()}`;
      const billRec = await Bill.create({
        bill_number,
        customer_name,
        date: new Date(),
        subtotal: totalBeforeBillDiscount,
        discount_percent: billDiscountPercent,
        total_amount: finalTotal,
        status: 'pending'
      }, { transaction: t });

      // attach bill_id and insert item sales
      const createRows = itemsToCreate.map((it) => ({ ...it, bill_id: billRec.id }));
      const createdItems = await ItemSale.bulkCreate(createRows, { transaction: t });

      await t.commit();
      const billJson = billRec.toJSON ? billRec.toJSON() : billRec;
      const itemsJson = Array.isArray(createdItems) ? createdItems.map(i => (i.toJSON ? i.toJSON() : i)) : createdItems;
      const response = { success: true, data: { bill: billJson, items: itemsJson }, message: 'Bill created' };
      return res.status(201).json(response);
    } catch (err) {
      await t.rollback();
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  getAll: async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const result = await BillRepo.getAll({ page, limit });
      if (result.success) return res.status(200).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  getById: async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const result = await BillRepo.getById(id);
      if (!result.success) return res.status(404).json(result);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET by bill_number
  getByNumber: async (req, res) => {
    try {
      const billNumber = String(req.params.bill_number || req.query.bill_number || '').trim();
      if (!billNumber) return res.status(400).json({ success: false, message: 'bill_number is required' });
      const result = await BillRepo.getByNumber(billNumber);
      if (!result.success) return res.status(404).json(result);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const payload = req.body || {};
      console.log('Update Bill Payload:------------------<<<<<<<', payload);
      const result = await BillRepo.updateBill(id, payload);
      if (result.success) return res.status(200).json(result);
      if (result.message === 'Bill not found') return res.status(404).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  delete: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const force = (req.query.force === 'true') || (req.body && req.body.force === true);
      const deleted_by = Number(req.body?.deleted_by || req.query?.deleted_by || 0) || null;
      const result = await BillRepo.deleteBill(id, { force, deleted_by });
      if (result.success) return res.status(200).json(result);
      if (result.message === 'Bill not found') return res.status(404).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default BillController;
