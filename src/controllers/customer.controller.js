import CustomerRepo from "../repositories/customer.repository.js";

const CustomerController = {
  create: async (req, res) => {
    try {
      const payload = req.body || {};
      console.log('[CustomerController] Step 1: Received payload:', payload);
      // Remove unique_id check, always auto-generate
      // If no unique_id provided, let repository auto-generate it
      const result = await CustomerRepo.createCustomer(payload);
      console.log('[CustomerController] Step 2: CustomerRepo.createCustomer result:', result);
      if (result.success) {
        console.log('[CustomerController] Step 3: Customer created successfully');
        return res.status(201).json(result);
      }
      console.log('[CustomerController] Step 4: Customer creation failed');
      return res.status(400).json(result);
    } catch (err) {
      console.error('[CustomerController] Step 5: Error:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  checkUnique: async (req, res) => {
    try {
      const uniqueId = String(req.params.uniqueId || '').trim();
      if (!uniqueId) return res.status(400).json({ success: false, message: 'uniqueId is required' });
      const result = await CustomerRepo.getByUniqueId(uniqueId);
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
      // No longer supporting type-based filtering; all are customers
      const result = await CustomerRepo.getCustomers({ page, limit, filters });
      if (result.success) return res.status(200).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Simplified getAll for dropdowns - returns just id, company_name, unique_id
  getAllDropdown: async (req, res) => {
    try {
      const result = await CustomerRepo.getAllSimplified();
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
