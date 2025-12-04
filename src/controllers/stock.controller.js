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

            // Note: `getAll` intentionally ignores named `period` shortcuts — use `/stock/period` for that.
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

    // GET /stock/period - period-aware listing that applies named period shortcuts
    getByPeriod: async (req, res) => {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const filters = {};
            if (req.query.status) filters.status = req.query.status;
            if (req.query.product_id) filters.product_id = Number(req.query.product_id);

            // apply named periods and asOf via shared helper
            StockController._applyPeriodToFilters(req, filters);

            // if year/month or explicit start/end were provided, the helper won't override them;
            // keep precedence: year/month -> start/end handled by repo if present in filters
            const startRaw = req.query.start || req.query.start_date || null;
            const endRaw = req.query.end || req.query.end_date || null;
            const year = req.query.year ? Number(req.query.year) : null;
            const month = req.query.month ? Number(req.query.month) : null;
            if (year && month) {
                const start = new Date(year, month - 1, 1);
                const end = new Date(year, month, 0);
                end.setHours(23, 59, 59, 999);
                filters.start_date = start.toISOString();
                filters.end_date = end.toISOString();
            } else if (startRaw || endRaw) {
                if (startRaw) filters.start_date = new Date(startRaw).toISOString();
                if (endRaw) {
                    const e = new Date(endRaw);
                    if (e.getHours() === 0 && e.getMinutes() === 0 && e.getSeconds() === 0) e.setHours(23, 59, 59, 999);
                    filters.end_date = e.toISOString();
                }
            }

            // If the user asked for the last_three_months period, return the snapshot-before-window + ledger records
            const period = (req.query.period || '').toString().trim().toLowerCase();
            const asOf = req.query.asOf || req.query.as_of || null;
            if (period === 'last_three_months' || period === 'last3' || period === 'last_three') {
                const view = await StockRepo.getLastThreeMonthsView({ asOf });
                if (!view || !view.success) return res.status(400).json({ success: false, message: view?.message || 'Failed to get last three months view' });
                // snapshotRows is the snapshot before the window; records are ledger rows in the window
                return res.status(200).json({ success: true, snapshotInfo: view.data.snapshotInfo, summary: view.data.snapshotRows, stocks: view.data.records, start: view.data.start, end: view.data.end });
            }

            // Otherwise behave as before: fetch summary then ledger rows
            let summaryResult = null;
            if (year && month) {
                summaryResult = await StockRepo.getMonthlySummary({ year, month });
            } else {
                summaryResult = await StockRepo.getStockSummaryWithSnapshot();
            }
            if (!summaryResult || !summaryResult.success) return res.status(400).json({ success: false, message: summaryResult?.message || 'Failed to get stock summary' });

            const stocksResult = await StockRepo.getStocks({ page, limit, filters });
            if (!stocksResult || !stocksResult.success) return res.status(400).json({ success: false, message: stocksResult?.message || 'Failed to get stock records' });

            // Optionally filter summary to a specific product_id if requested
            let summaryData = summaryResult.data || [];
            if (filters.product_id) {
                summaryData = (Array.isArray(summaryData) ? summaryData : []).filter(s => Number(s.product_id) === Number(filters.product_id));
            }

            return res.status(200).json({ success: true, summary: summaryData, stocks: stocksResult.data, meta: stocksResult.meta });
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
            // differentiate period behavior:
            // - if period=last_three_months -> return the last-three-months view (snapshot-before-window + ledger records)
            // - if year+month -> return stored monthly snapshot
            // - if period (other) or start/end provided -> compute aggregated totals within that range
            // - otherwise -> return snapshot-aware aggregated summary

            const period = (req.query.period || '').toString().trim().toLowerCase();
            const asOf = req.query.asOf || req.query.as_of || null;

            if (period === 'last_three_months' || period === 'last3' || period === 'last_three') {
                const view = await StockRepo.getLastThreeMonthsView({ asOf });
                if (!view || !view.success) return res.status(400).json({ success: false, message: view?.message || 'Failed to get last three months view' });
                return res.status(200).json({ success: true, snapshotInfo: view.data.snapshotInfo, summary: view.data.snapshotRows, stocks: view.data.records, start: view.data.start, end: view.data.end });
            }

            const year = req.query.year ? Number(req.query.year) : null;
            const month = req.query.month ? Number(req.query.month) : null;
            if (year && month) {
                const result = await StockRepo.getMonthlySummary({ year, month });
                if (result.success) return res.status(200).json(result);
                return res.status(400).json(result);
            }

            // if a named period or explicit start/end is provided, compute range and aggregate within it
            const startRaw = req.query.start || req.query.start_date || null;
            const endRaw = req.query.end || req.query.end_date || null;
            if (period || startRaw || endRaw) {
                const filters = {};
                if (req.query.product_id) filters.product_id = Number(req.query.product_id);
                // apply named period if present
                if (period) StockController._applyPeriodToFilters(req, filters);
                // explicit start/end override
                let start = filters.start_date || (startRaw ? new Date(startRaw).toISOString() : null);
                let end = filters.end_date || null;
                if (endRaw && !filters.end_date) {
                    const e = new Date(endRaw);
                    if (e.getHours() === 0 && e.getMinutes() === 0 && e.getSeconds() === 0) e.setHours(23, 59, 59, 999);
                    end = e.toISOString();
                }
                if (!start || !end) return res.status(400).json({ success: false, message: 'start and end dates required for period summary' });
                const product_id = filters.product_id || null;
                const rangeResult = await StockRepo.getStockSummaryInRange({ start_date: start, end_date: end, product_id });
                if (!rangeResult || !rangeResult.success) return res.status(400).json({ success: false, message: rangeResult?.message || 'Failed to compute range summary' });
                return res.status(200).json({ success: true, summary: rangeResult.data, start, end });
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

    // GET /stock/last_three_months?asOf=YYYY-MM-DD
    lastThreeMonths: async (req, res) => {
        try {
            const asOf = req.query.asOf || req.query.as_of || null;
            const result = await StockRepo.getLastThreeMonthsView({ asOf });
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    // helper: support named periods for summary endpoint as well
    _applyPeriodToFilters: (req, filters) => {
        const period = (req.query.period || '').toString().trim().toLowerCase();
        const asOf = req.query.asOf || req.query.as_of || null;
        if (!period) return filters;
        const now = asOf ? new Date(asOf) : new Date();
        let start = null; let end = null;
        switch (period) {
            case 'today':
                start = new Date(now); start.setHours(0,0,0,0);
                end = new Date(now); end.setHours(23,59,59,999);
                break;
            case 'yesterday':
                start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0,0,0,0);
                end = new Date(start); end.setHours(23,59,59,999);
                break;
            case 'this_month':
            case 'thismonth':
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1); start.setHours(0,0,0,0);
                end = new Date(now); end.setHours(23,59,59,999);
                break;
            case 'last_three_months':
            case 'last3':
            case 'last_three':
                start = new Date(now); start.setMonth(start.getMonth() - 3); start.setHours(0,0,0,0);
                end = new Date(now); end.setHours(23,59,59,999);
                break;
            case 'this_year':
            case 'year':
                start = new Date(now.getFullYear(), 0, 1); start.setHours(0,0,0,0);
                end = new Date(now); end.setHours(23,59,59,999);
                break;
            default:
                return filters;
        }
        filters.start_date = start.toISOString();
        filters.end_date = end.toISOString();
        return filters;
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