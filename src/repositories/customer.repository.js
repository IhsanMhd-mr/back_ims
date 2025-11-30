import { Customer } from "../models/customer.model.js";
import sequelize from "../config/db.js";

const CustomerRepo = {
  createCustomer: async (payload) => {
    try {
      const result = await Customer.create(payload);
      return { success: true, data: result, message: 'Customer created' };
    } catch (error) {
      return { success: false, message: error?.message || 'Create failed' };
    }
  },

  getByUniqueId: async (uniqueId) => {
    try {
      const result = await Customer.findOne({ where: { unique_id: uniqueId } });
      if (!result) return { success: true, available: true };
      return { success: true, available: false, data: result };
    } catch (error) {
      return { success: false, message: error?.message };
    }
  },

  getCustomers: async ({ page = 1, limit = 20, filters = {} } = {}) => {
    try {
      const offset = (page - 1) * limit;
      const { rows: data, count: total } = await Customer.findAndCountAll({ where: filters, limit, offset, order: [['createdAt', 'DESC']] });
      return { success: true, data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    } catch (error) {
      return { success: false, message: error?.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await Customer.findByPk(id);
      if (!result) return { success: false, message: 'Customer not found' };
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error?.message };
    }
  },

  updateCustomer: async (id, updateData) => {
    try {
      const cust = await Customer.findByPk(id);
      if (!cust) return { success: false, message: 'Customer not found' };
      await cust.update(updateData);
      return { success: true, data: cust, message: 'Customer updated' };
    } catch (error) {
      return { success: false, message: error?.message };
    }
  },

  deleteCustomer: async (id) => {
    try {
      const cust = await Customer.findByPk(id);
      if (!cust) return { success: false, message: 'Customer not found' };
      await cust.destroy();
      return { success: true, message: 'Customer deleted' };
    } catch (error) {
      return { success: false, message: error?.message };
    }
  }
};

export default CustomerRepo;
