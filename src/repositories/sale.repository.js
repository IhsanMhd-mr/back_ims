import { Sale } from '../models/sale.model.js';

const SaleRepo = {
  createSale: async (data) => {
    try {
      const rec = await Sale.create(data);
      return { success: true, data: rec, message: 'Sale created' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  getAll: async ({ page = 1, limit = 50 } = {}) => {
    try {
      const offset = (page - 1) * limit;
      const { rows: data, count: total } = await Sale.findAndCountAll({ limit, offset, order: [['createdAt', 'DESC']] });
      return { success: true, data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  getById: async (id) => {
    try {
      const rec = await Sale.findByPk(id);
      if (!rec) return { success: false, message: 'Sale not found' };
      return { success: true, data: rec };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  updateSale: async (id, data) => {
    try {
      const rec = await Sale.findByPk(id);
      if (!rec) return { success: false, message: 'Sale not found' };
      await rec.update(data);
      return { success: true, data: rec, message: 'Sale updated' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  deleteSale: async (id) => {
    try {
      const rec = await Sale.findByPk(id);
      if (!rec) return { success: false, message: 'Sale not found' };
      await rec.destroy();
      return { success: true, message: 'Sale deleted' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
};

export { SaleRepo };
