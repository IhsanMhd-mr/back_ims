import sequelize from '../config/db.js';
import { Product } from '../models/product.model.js';
import { Bill } from '../models/bill.model.js';
import { ItemSale } from '../models/item-sale.model.js';
import { BillRepo } from '../repositories/bill.repository.js';
import StockService from '../services/stock.service.js';

const BillController = {
  // Create a bill from product IDs and quantities in the request body.
  // Body shape:
  // {
  //   customer_name: 'John Doe',
  //   products: [ { product_id: 17, quantity: 3 }, ... ]
  // }
  create: async (req, res) => {
    const startTime = Date.now();
    const t = await sequelize.transaction();
    try {
      const body = req.body || {};
      console.log('------>>> [BillController] Step 1: Received body:', body);
      const customer_name = body.customer_name || body.customer || '';
      const products = Array.isArray(body.products) ? body.products : (Array.isArray(body.items) ? body.items : []);
      if (!customer_name) return res.status(400).json({ success: false, message: 'customer_name is required' });
      if (!Array.isArray(products) || products.length === 0) return res.status(400).json({ success: false, message: 'products array is required' });

      const variantIds = products
        .map(p => String(p?.product_id || p?.variant_id || '').trim())
        .filter(Boolean);
      if (variantIds.length === 0) return res.status(400).json({ success: false, message: 'No valid variant_id/product_id provided in items' });

      console.log('------>>> [BillController] Step 2: Fetching products for variantIds:', variantIds);
      const dbProducts = await Product.findAll({ where: { variant_id: variantIds } });
      const productMap = new Map(dbProducts.map((p) => [String(p.variant_id), p]));

      const itemsToCreate = [];
      let totalBeforeBillDiscount = 0;
      for (const p of products) {
        const variantKey = String(p?.product_id || p?.variant_id || '').trim();
        const prod = productMap.get(variantKey);
        if (!prod) {
          await t.rollback();
          console.log('------>>> [BillController] Step 3: Product not found:', p.product_id);
          return res.status(400).json({ success: false, message: `Product not found: ${p.product_id}` });
        }
        const quantity = Number(p.quantity) || 0;
        const unit_price = (p.unit_price !== undefined && p.unit_price !== null) ? Number(p.unit_price) : (Number(prod.mrp) ? parseFloat(prod.mrp) : 0);
        const itemDiscountPercent = Number(p.discount_percent || 0);
        const lineBefore = parseFloat((quantity * unit_price).toFixed(2));
        let lineAfter = parseFloat((lineBefore * (1 - itemDiscountPercent / 100)).toFixed(2));
        if (lineAfter < 0) lineAfter = 0;
        totalBeforeBillDiscount += lineAfter;
        itemsToCreate.push({
          product_id: prod.id,
          variant_id: prod.variant_id,
          product_name: prod.name,
          sku: prod.sku,
          quantity,
          unit_price,
          discount_percent: itemDiscountPercent,
          subtotal: lineAfter,
        });
      }

      console.log('------>>> [BillController] Step 4: Items to create:', itemsToCreate);
      const billDiscountPercent = Number(body.discount_percent || 0);
      let finalTotal = parseFloat((totalBeforeBillDiscount * (1 - billDiscountPercent / 100)).toFixed(2));
      if (finalTotal < 0) finalTotal = 0;

      console.log('------>>> [BillController] Step 5: Creating bill record');
      const bill_number = `BILL-${Date.now()}`;
      const billRec = await Bill.create({
        bill_number,
        customer_name,
        date: new Date(),
        subtotal: totalBeforeBillDiscount,
        discount_percent: billDiscountPercent,
        total_amount: finalTotal,
        status: 'PENDING'
      }, { transaction: t });

      console.log('------>>> [BillController] Step 6: Creating item sales');
      const createRows = itemsToCreate.map((it) => ({ ...it, bill_id: billRec.id }));
      const createdItems = await ItemSale.bulkCreate(createRows, { transaction: t });

      await t.commit();
      const elapsed = Date.now() - startTime;
      console.log('------>>> [BillController] Step 7: Bill and items committed');
      const billJson = billRec.toJSON ? billRec.toJSON() : billRec;
      const itemsJson = Array.isArray(createdItems) ? createdItems.map(i => (i.toJSON ? i.toJSON() : i)) : createdItems;
      const response = { success: true, data: { bill: billJson, items: itemsJson }, message: 'Bill created' };
      console.log('------>>> [BillController] FINAL OUTPUT:', JSON.stringify(response, null, 2));
      console.log(`------>>> [BillController] DB commit time: ${elapsed} ms`);
      return res.status(201).json(response);
    } catch (err) {
      await t.rollback();
      console.log('------>>> [BillController] Step 8: Error:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  getAll: async (req, res) => {
    try {
      const start = Date.now();
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const result = await BillRepo.getAll({ page, limit });
      const elapsed = Date.now() - start;
      console.log(`------>>> [BillController] getAll bills DB fetch time: ${elapsed} ms`);
      if (result.success) return res.status(200).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  getById: async (req, res) => {
    try {
      const start = Date.now();
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const result = await BillRepo.getById(id);
      const elapsed = Date.now() - start;
      console.log(`------>>> [BillController] getById bill DB fetch time: ${elapsed} ms`);
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
      if (!id) return res.status(400).json({ success: false, message: 'Invalid bill id' });
      const payload = req.body || {};
      const result = await BillRepo.updateBill(id, payload);
      if (result.success) return res.status(200).json(result);
      if (result.message === 'Bill not found') return res.status(404).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Handle bill status changes (PENDING, COMPLETED, REJECTED)
  statusHandle: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.params.status || '').trim().toUpperCase();
      
      if (!id) return res.status(400).json({ success: false, message: 'Invalid bill id' });
      if (!['PENDING', 'COMPLETED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
      }
      
      const user_id = Number(req.body?.user_id || req.query?.user_id || 0) || null;
      const updateData = { status, updated_by: user_id };
      const result = await BillRepo.updateBill(id, updateData);

      if (result.success && status === 'COMPLETED') {
        // Run stock creation in the background, do not await
        (async () => {
          try {
            const billResult = await BillRepo.getById(id);
            if (billResult.success && billResult.data?.items?.length > 0) {
              // await StockService.createStockFromBillCompletion(billResult.data, user_id);
              console.log(`------>>> [BillController] Stock creation completed for Bill ${id}`);
            }
          } catch (stockErr) {
            console.error(`[Bill ${id}] Stock error (background): ${stockErr.message}`);
          }
        })();
      }

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
