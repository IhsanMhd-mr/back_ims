import VendorRepo from "../repositories/vendor.repository.js";

const VendorController = {
  create: async (req, res) => {
    try {
      const payload = req.body || {};
      const result = await VendorRepo.createVendor(payload);
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
      const result = await VendorRepo.getByUniqueId(uniqueId);
      if (!result.success) return res.status(500).json(result);
      return res.status(200).json({ success: true, available: result.available, result });
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
      const result = await VendorRepo.getVendors({ page, limit, filters });
      if (result.success) return res.status(200).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Simplified getAll for dropdowns - returns just id, company_name, unique_id
  getAllDropdown: async (req, res) => {
    try {
      const result = await VendorRepo.getAllSimplified();
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
      const result = await VendorRepo.getById(id);
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
      const result = await VendorRepo.updateVendor(id, req.body);
      if (result.success) return res.status(200).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  delete: async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const result = await VendorRepo.deleteVendor(id);
      if (result.success) return res.status(200).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};

export default VendorController;
