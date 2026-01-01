import { Vendor } from "../models/vendor.model.js";
import sequelize from "../config/db.js";

const VendorRepo = {
  createVendor: async (payload) => {
    try {
      // Ensure required fields
      if (!payload.company_name) return { success: false, message: 'company_name is required' };
      // Auto-generate unique_id if not provided
      let unique_id 
     payload.unique_id = 0
      
        // Find max numeric unique_id and increment
        const last = await Vendor.findOne({ order: [['id', 'DESC']] });
        const nextId = last ? last.id + 1 : 1;
        unique_id = `VEND${String(nextId).padStart(4, '0')}`;
      console.log('Creating vendor with unique_id:', unique_id,`last id: ${last ? last.id : 'none'}`);
      const vendor = await Vendor.create({
        unique_id,
        company_name: payload.company_name,
        contact_no: payload.contact_no,
        address: payload.address,
        remarks: payload.remarks,
        status: payload.status || 'ACTIVE',
      });
      return { success: true, data: vendor, message: 'Vendor created' };
    } catch (error) {
      // If Sequelize validation error, return first error message
      if (error && error.errors && error.errors.length > 0) {
        return { success: false, message: error.errors[0].message };
      }
      return { success: false, message: error?.message || 'Create failed' };
    }
  },

  getByUniqueId: async (uniqueId) => {
    try {
      const result = await Vendor.findOne({ where: { unique_id: uniqueId } });
      if (!result) return { success: true, available: true };
      return { success: true, available: false, data: result };
    } catch (error) {
      return { success: false, message: error?.message };
    }
  },

  getVendors: async ({ page = 1, limit = 20, filters = {} } = {}) => {
    try {
      const offset = (page - 1) * limit;
      const { rows: data, count: total } = await Vendor.findAndCountAll({ where: filters, limit, offset, order: [['createdAt', 'DESC']] });
      return { success: true, data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    } catch (error) {
      return { success: false, message: error?.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await Vendor.findByPk(id);
      if (!result) return { success: false, message: 'Vendor not found' };
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error?.message };
    }
  },

  updateVendor: async (id, updateData) => {
    try {
      const vendor = await Vendor.findByPk(id);
      if (!vendor) return { success: false, message: 'Vendor not found' };
      await vendor.update(updateData);
      return { success: true, data: vendor, message: 'Vendor updated' };
    } catch (error) {
      return { success: false, message: error?.message };
    }
  },

  deleteVendor: async (id) => {
    try {
      const vendor = await Vendor.findByPk(id);
      if (!vendor) return { success: false, message: 'Vendor not found' };
      await vendor.destroy();
      return { success: true, message: 'Vendor deleted' };
    } catch (error) {
      return { success: false, message: error?.message };
    }
  },

  /**
   * Generate a unique vendor ID (prefix V + timestamp + random)
   */
  generateUniqueVendorId: () => {
    return 'V' + Date.now().toString(36) + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  },
};

export default VendorRepo;
