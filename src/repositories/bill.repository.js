import { Bill } from '../models/bill.model.js';
import { ItemSale } from '../models/item-sale.model.js';
import sequelize from '../config/db.js';

const BillRepo = {
  createBill: async (data) => {
    try {
      const rec = await Bill.create(data);
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
      const billRec = await Bill.create(bill, { transaction: t });
      // attach bill_id to each item and ensure types are ok
      const itemsToCreate = items.map((it) => ({ ...it, bill_id: billRec.id }));
      await ItemSale.bulkCreate(itemsToCreate, { transaction: t });
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
      const { rows: data, count: total } = await Bill.findAndCountAll({ limit, offset, order: [['createdAt', 'DESC']] });
      return { success: true, data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  getById: async (id) => {
    try {
      const rec = await Bill.findByPk(id, { include: [{ model: ItemSale, as: 'items' }] });
      if (!rec) return { success: false, message: 'Bill not found' };
      return { success: true, data: rec };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  getByNumber: async (billNumber) => {
    try {
      const rec = await Bill.findOne({ where: { bill_number: billNumber }, include: [{ model: ItemSale, as: 'items' }] });
      if (!rec) return { success: false, message: 'Bill not found' };
      return { success: true, data: rec };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  updateBill: async (id, data) => {
    // Enhanced update: supports updating bill fields and items in a single transaction.
    // If `data` contains `itemsToCreate`, `itemsToUpdate`, or `itemsToDelete` arrays,
    // those will be processed. Otherwise behaves like prior update.
    const t = await sequelize.transaction();
    try {
      const rec = await Bill.findByPk(id, { transaction: t });
      if (!rec) {
        await t.rollback();
        return { success: false, message: 'Bill not found' };
      }

      // Extract item operations (optional)
      const itemsToCreate = Array.isArray(data.itemsToCreate) ? data.itemsToCreate : [];
      const itemsToUpdate = Array.isArray(data.itemsToUpdate) ? data.itemsToUpdate : [];
      const itemsToDelete = Array.isArray(data.itemsToDelete) ? data.itemsToDelete : [];

      // Remove item arrays from bill update payload
      const billPayload = { ...data };
      delete billPayload.itemsToCreate;
      delete billPayload.itemsToUpdate;
      delete billPayload.itemsToDelete;

      // Update bill fields if any
      if (Object.keys(billPayload).length > 0) {
        await rec.update(billPayload, { transaction: t });
      }

      // Process deletes
      if (itemsToDelete.length > 0) {
        await ItemSale.destroy({ where: { id: itemsToDelete }, transaction: t });
      }

      // Process updates
      for (const it of itemsToUpdate) {
        if (!it.id) continue;
        const existing = await ItemSale.findByPk(it.id, { transaction: t });
        if (!existing) continue;
        // Only update allowed fields
        const allowed = ['product_id', 'product_name', 'sku', 'variant_id', 'quantity', 'unit_price', 'discount_percent', 'subtotal'];
        const upd = {};
        for (const k of allowed) if (it[k] !== undefined) upd[k] = it[k];
        if (Object.keys(upd).length > 0) await existing.update(upd, { transaction: t });
      }

      // Process creates
      if (itemsToCreate.length > 0) {
        const createRows = itemsToCreate.map((it) => ({ ...it, bill_id: rec.id }));
        await ItemSale.bulkCreate(createRows, { transaction: t });
      }

      await t.commit();
      const updated = await Bill.findByPk(id, { include: [{ model: ItemSale, as: 'items' }] });
      return { success: true, data: updated, message: 'Bill updated' };
    } catch (err) {
      await t.rollback();
      return { success: false, message: err.message };
    }
  },

  // options: { force: boolean, deleted_by: integer }
  deleteBill: async (id, options = {}) => {
    const { force = false, deleted_by = null } = options || {};
    const t = await sequelize.transaction();
    try {
      // Find including soft-deleted records so we can hard-delete when requested
      const rec = await Bill.findByPk(id, { include: [{ model: ItemSale, as: 'items' }], transaction: t, paranoid: false });
      if (!rec) {
        await t.rollback();
        return { success: false, message: 'Bill not found' };
      }

      // If deleted_by provided, set it on items first (so audit is recorded)
      const items = rec.items || [];
      if (deleted_by && items.length > 0) {
        await Promise.all(items.map(i => i.update({ deleted_by }, { transaction: t })));
      }

      // Destroy child ItemSale rows first. Only if this succeeds (rows removed/soft-deleted)
      // do we proceed to destroy the bill.
      let destroyedCount = 0;
      if (items.length > 0) {
        destroyedCount = await ItemSale.destroy({ where: { bill_id: id }, transaction: t, force });
        // If the number of affected rows doesn't match the expected items count, treat as failure
        if (destroyedCount !== items.length) {
          await t.rollback();
          return { success: false, message: `Failed to delete all item sales (${destroyedCount}/${items.length})` };
        }
      }

      // All child deletes succeeded (or there were no items). Now set deleted_by on bill (if provided)
      if (deleted_by) {
        try {
          await rec.update({ deleted_by }, { transaction: t });
        } catch (e) {
          await t.rollback();
          return { success: false, message: 'Failed to set deleted_by on bill' };
        }
      }

      // Finally destroy the bill (soft by default, hard if force)
      await rec.destroy({ transaction: t, force });

      await t.commit();
      return { success: true, message: force ? 'Bill permanently deleted' : 'Bill deleted' };
    } catch (err) {
      await t.rollback();
      return { success: false, message: err.message };
    }
  }
};

export { BillRepo };
