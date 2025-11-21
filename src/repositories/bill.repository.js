import { Biller } from '../models/bill.model.js';
import { Item } from '../models/item-sale.model.js';
import sequelize from '../config/db.js';

const BillRepo = {
  createBill: async (data) => {
    try {
      const rec = await Biller.create(data);
      return { success: true, data: rec, message: 'Bill created' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Create a bill and its items in a single transaction.
  // payload: { bill: { ... }, items: [ { name, qty, cost, mrp, weight, unit, ... } ] }
  createBillWithItems: async (payload) => {
    const { bill = {}, items = [] } = payload || {};
    const t = await sequelize.transaction();
    try {
      const billRec = await Biller.create(bill, { transaction: t });
      // attach biller_id to each item and ensure types are ok
      const itemsToCreate = items.map(it => ({ ...it, biller_id: billRec.id }));
      await Item.bulkCreate(itemsToCreate, { transaction: t });
      await t.commit();
      return { success: true, data: { bill: billRec }, message: 'Bill and items created' };
    } catch (err) {
      await t.rollback();
      return { success: false, message: err.message };
    }
  },

  getAll: async ({ page = 1, limit = 50 } = {}) => {
    try {
      const offset = (page - 1) * limit;
      const { rows: data, count: total } = await Biller.findAndCountAll({ limit, offset, order: [['createdAt', 'DESC']] });
      return { success: true, data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  getById: async (id) => {
    try {
      const rec = await Biller.findByPk(id, { include: [{ model: Item, as: 'items' }] });
      if (!rec) return { success: false, message: 'Bill not found' };
      return { success: true, data: rec };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  updateBill: async (id, data) => {
    try {
      const rec = await Biller.findByPk(id);
      if (!rec) return { success: false, message: 'Bill not found' };
      await rec.update(data);
      return { success: true, data: rec, message: 'Bill updated' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  deleteBill: async (id) => {
    try {
      const rec = await Biller.findByPk(id);
      if (!rec) return { success: false, message: 'Bill not found' };
      await rec.destroy();
      return { success: true, message: 'Bill deleted' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
};

export { BillRepo };
