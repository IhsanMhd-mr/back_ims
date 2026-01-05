import { Customer } from "../models/customer.model.js";
import sequelize from "../config/db.js";

const CustomerRepo = {
  createCustomer: async (payload) => {
    try {
      console.log('Creating customer with payload - 1.2:', payload);
      // Ensure company_name present
      if (!payload.company_name) return { success: false, message: 'company_name is required' };
      // Auto-generate unique_id if not provided or empty
       payload.unique_id = 0;
      let unique_id ;

      
        const last = await Customer.findOne({ order: [['id', 'DESC']] });
        const nextId = last ? last.id + 1 : 1;
        unique_id = `CUST${String(nextId).padStart(4, '0')}`;
      
      const toCreate = { ...payload, unique_id };
      const result = await Customer.create(toCreate);
      return { success: true, data: result, message: 'Customer created' };
    } catch (error) {
      // If Sequelize validation error, return first error message
      if (error && error.name === 'SequelizeUniqueConstraintError') {
        // Find which field caused unique constraint
        const field = error.errors && error.errors[0] && error.errors[0].path;
        if (field === 'unique_id') return { success: false, message: 'unique_id already exists' };
        return { success: false, message: error.errors && error.errors[0] && error.errors[0].message ? error.errors[0].message : 'Unique constraint error' };
      }
      if (error && error.errors && error.errors.length > 0) {
        return { success: false, message: error.errors[0].message };
      }
      return { success: false, message: error?.message || 'Create failed' };
    }
  },

  getByUniqueId: async (uniqueId) => {
    try {
      const result = await Customer.findOne({ where: { unique_id: uniqueId } });
      console.log('CustomerRepo getByUniqueId result:', result);
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

  // Simplified list for dropdowns - returns just essential fields
  getAllSimplified: async () => {
    try {
      const data = await Customer.findAll({
        attributes: ['id', 'unique_id', 'company_name', 'contact_no'],
        where: { status: 'ACTIVE' },
        order: [['company_name', 'ASC']]
      });
      return { success: true, data };
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
  },

  /**
   * Generate a unique customer ID (prefix C + timestamp + random)
   */
  generateUniqueCustomerId: () => {
    return 'C' + Date.now().toString(36) + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  },
};

export default CustomerRepo;
