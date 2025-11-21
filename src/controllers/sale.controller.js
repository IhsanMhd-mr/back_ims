import { SaleRepo } from '../repositories/sale.repository.js';

const SaleController = {
  create: async (req, res) => {
    try {
      const payload = req.body || {};
      const result = await SaleRepo.createSale(payload);
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
      const result = await SaleRepo.getAll({ page, limit });
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
      const result = await SaleRepo.getById(id);
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
      const result = await SaleRepo.updateSale(id, payload);
      if (result.success) return res.status(200).json(result);
      if (result.message === 'Sale not found') return res.status(404).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  delete: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const result = await SaleRepo.deleteSale(id);
      if (result.success) return res.status(200).json(result);
      if (result.message === 'Sale not found') return res.status(404).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default SaleController;
