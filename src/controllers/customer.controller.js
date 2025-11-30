import CustomerRepo from "../repositories/customer.repository.js";

const CustomerController = {
  create: async (req, res) => {
    try {
      const payload = req.body || {};
      if (!payload.unique_id) return res.status(400).json({ success: false, message: 'unique_id is required' });
      const check = await CustomerRepo.getByUniqueId(payload.unique_id);
      if (!check.success) return res.status(500).json(check);
      if (!check.available) return res.status(409).json({ success: false, message: 'unique_id already in use' });
      const result = await CustomerRepo.createCustomer(payload);
      if (result.success) return res.status(201).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  checkUnique: async (req, res) => {
    try {
      const uniqueId = String(req.params.uniqueId || '').trim();
      if (!uniqueId) return res.status(400).json({ success: false, message: 'uniqueId is required' });
      const result = await CustomerRepo.getByUniqueId(uniqueId);
      if (!result.success) return res.status(500).json(result);
      return res.status(200).json({ success: true, available: result.available });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  getAll: async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      const result = await CustomerRepo.getCustomers({ page, limit, filters });
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
      const result = await CustomerRepo.getById(id);
      if (!result.success) return res.status(404).json(result);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const payload = req.body || {};
      const result = await CustomerRepo.updateCustomer(id, payload);
      if (result.success) return res.status(200).json(result);
      if (result.message && result.message.includes('not found')) return res.status(404).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  delete: async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const result = await CustomerRepo.deleteCustomer(id);
      if (result.success) return res.status(200).json(result);
      if (result.message && result.message.includes('not found')) return res.status(404).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default CustomerController;
