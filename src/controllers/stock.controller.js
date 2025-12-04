import StockRepo from '../repositories/stock.repository.js';

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

            // Time period support: accept start/end ISO dates or year+month
            const startRaw = req.query.start || req.query.start_date || null;
            const endRaw = req.query.end || req.query.end_date || null;
            const year = req.query.year ? Number(req.query.year) : null;
            const month = req.query.month ? Number(req.query.month) : null;

            if (year && month) {
                // build start = first day of month, end = last moment of month
                const start = new Date(year, month - 1, 1);
                const end = new Date(year, month, 0);
                end.setHours(23, 59, 59, 999);
                filters.start_date = start.toISOString();
                filters.end_date = end.toISOString();
            } else if (startRaw || endRaw) {
                if (startRaw) filters.start_date = new Date(startRaw).toISOString();
                if (endRaw) {
                    const e = new Date(endRaw);
                    // if user provided a date without time, include full day
                    if (e.getHours() === 0 && e.getMinutes() === 0 && e.getSeconds() === 0) e.setHours(23, 59, 59, 999);
                    filters.end_date = e.toISOString();
                }
            }
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

    // GET /stock/summary - return aggregated stock per product
    summary: async (req, res) => {
        try {
            // if month/year query provided, return stored snapshot
            const year = req.query.year ? Number(req.query.year) : null;
            const month = req.query.month ? Number(req.query.month) : null;
            if (year && month) {
                const result = await StockRepo.getMonthlySummary({ year, month });
                if (result.success) return res.status(200).json(result);
                return res.status(400).json(result);
            }

            // otherwise return snapshot-aware aggregated summary
            const result = await StockRepo.getStockSummaryWithSnapshot();
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    // POST /stock/adjust - adjust stock with note
    adjust: async (req, res) => {
        try {
            const payload = req.body || {};
            const result = await StockRepo.adjustStock(payload);
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    // POST /stock/convert - convert materials to products
    convert: async (req, res) => {
        try {
            const payload = req.body || {};
            const result = await StockRepo.convertMaterialsToProducts(payload);
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    // POST /stock/sell - record sale stock reductions
    sell: async (req, res) => {
        try {
            const payload = req.body || {};
            const result = await StockRepo.sellProducts(payload);
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    // POST /stock/milestone - create monthly snapshot (body: { year, month, createdBy })
    createMilestone: async (req, res) => {
        try {
            const payload = req.body || {};
            const result = await StockRepo.createMonthlySummary(payload);
            if (result.success) return res.status(201).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    // GET /stock/milestone/:year/:month - retrieve snapshot
    getMilestone: async (req, res) => {
        try {
            const year = Number(req.params.year);
            const month = Number(req.params.month);
            const result = await StockRepo.getMonthlySummary({ year, month });
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