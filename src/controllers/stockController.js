import StockRepo from '../repositories/stockRepository.js';

const StockController = {
    create: async (req, res) => {
        try {
            const payload = req.body || {};
            const result = await StockRepo.createStockEntry(payload);
            if (result.success) return res.status(201).json(result);
            return res.status(400).json(result);
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
            if (req.query.product_id) filters.product_id = Number(req.query.product_id);
            // add more query filters as needed (date, approver_id, etc.)
            const result = await StockRepo.getStocks({ page, limit, filters });
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    search: async (req, res) => {
        try {
            const searchTerm = req.query.q || req.query.search || '';
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const result = await StockRepo.searchStocks({ searchTerm, page, limit });
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
            const result = await StockRepo.getStockById(id);
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
            // optional: set payload.updatedBy from req.user if auth exists
            const result = await StockRepo.updateStock(id, payload);
            if (result.success) return res.status(200).json(result);
            if (result.message === 'Stock not found') return res.status(404).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    statusUpdate: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const statusParam = req.params.params; // route uses :params
            if (!id || !statusParam) return res.status(400).json({ success: false, message: 'Invalid parameters' });
            const status = String(statusParam);
            const result = await StockRepo.updateStockStatus(id, status);
            if (result.success) return res.status(200).json(result);
            if (result.message === 'Stock not found') return res.status(404).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    remove: async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
            const deletedBy = req.body?.deletedBy ?? req.query?.deletedBy ?? null;
            const result = await StockRepo.deleteStock(id, deletedBy);
            if (result.success) return res.status(200).json(result);
            if (result.message === 'Stock not found') return res.status(404).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    adminDelete: async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
            const result = await StockRepo.hardDeleteStock(id);
            if (result.success) return res.status(200).json(result);
            if (result.message === 'Stock not found') return res.status(404).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
};

export default StockController;