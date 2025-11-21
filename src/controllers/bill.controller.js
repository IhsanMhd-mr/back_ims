import { BillRepo } from '../repositories/bill.repository.js';

const BillController = {
  create: async (req, res) => {
    try {
      const payload = req.body || {};
      // If items are provided, use the transactional create that inserts bill and item lines together
      let result;
      if (Array.isArray(payload.items) && payload.items.length > 0) {
        result = await BillRepo.createBillWithItems({ bill: payload.bill || payload, items: payload.items });
      } else {
        // plain create
        result = await BillRepo.createBill(payload);
      }
      if (result.success) return res.status(201).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  getAll: async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const result = await BillRepo.getAll({ page, limit });
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
      const result = await BillRepo.getById(id);
      if (!result.success) return res.status(404).json(result);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const payload = req.body || {};
      const result = await BillRepo.updateBill(id, payload);
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
      const result = await BillRepo.deleteBill(id);
      if (result.success) return res.status(200).json(result);
      if (result.message === 'Bill not found') return res.status(404).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default BillController;
