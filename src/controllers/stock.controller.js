import StockRepo from '../repositories/stock.repository.js';
import { Stock } from '../models/stock.model.js';
import { Op } from 'sequelize';

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

    // Bulk create multiple stock entries with validation and variant->product resolution
    // Accepts either: an array body, { items: [...] }, or a GRN-like payload { type, supplier, grn_date, lines: [...] }
    bulkCreate: async (req, res) => {
        try {
            const payload = req.body || {};
            // normalize to items array
            let items = [];
            if (Array.isArray(payload)) items = payload;
            else if (Array.isArray(payload.items)) items = payload.items;
            else if (Array.isArray(payload.lines)) items = payload.lines;
            else items = [];

            if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'items (or lines) array is required and must not be empty' });

            const t = await Stock.sequelize.transaction();
            try {
                const prepared = [];
                for (const raw of items) {
                    const it = { ...raw };

                    // Support GRN's property names: purchase_cost -> cost, batch_no -> batch_number
                    if (it.purchase_cost != null && it.cost == null) it.cost = it.purchase_cost;
                    if (it.batch_no != null && it.batch_number == null) it.batch_number = it.batch_no;

                    // Determine item_type (default to 'product' if not specified)
                    if (!it.item_type) it.item_type = 'product';
                    if (!['material', 'product'].includes(it.item_type)) {
                        await t.rollback();
                        return res.status(400).json({ success: false, message: 'item_type must be "material" or "product"' });
                    }

                    // Resolve fk_id from product_id or variant_id or sku
                    let fk_id = it.fk_id;
                    if (!fk_id && it.product_id) fk_id = it.product_id;

                    // If fk_id is a string variant id, resolve it
                    if (fk_id && typeof fk_id === 'string' && isNaN(Number(fk_id))) {
                        const Model = it.item_type === 'material' ? Stock.sequelize.models.Material : Stock.sequelize.models.Product;
                        const record = await Model.findOne({ where: { variant_id: fk_id }, transaction: t });
                        if (record) fk_id = record.id;
                    }

                    // Resolve from variant_id if missing
                    if (!fk_id && it.variant_id) {
                        const Model = it.item_type === 'material' ? Stock.sequelize.models.Material : Stock.sequelize.models.Product;
                        const record = await Model.findOne({ where: { variant_id: it.variant_id }, transaction: t });
                        if (record) fk_id = record.id;
                    }

                    // Resolve from sku/product_sku if missing
                    if (!fk_id && (it.sku || it.product_sku)) {
                        const skuValue = it.sku || it.product_sku;
                        const Model = it.item_type === 'material' ? Stock.sequelize.models.Material : Stock.sequelize.models.Product;
                        const record = await Model.findOne({ where: { sku: skuValue }, transaction: t });
                        if (record) fk_id = record.id;
                    }

                    if (!fk_id || isNaN(Number(fk_id))) {
                        await t.rollback();
                        return res.status(400).json({ success: false, message: 'fk_id or resolvable variant_id/sku required for every item' });
                    }

                    // qty required numeric
                    if (it.qty == null || isNaN(Number(it.qty))) {
                        await t.rollback();
                        return res.status(400).json({ success: false, message: 'qty is required and must be numeric for every item' });
                    }
                    it.qty = Number(it.qty);

                    // cost normalization
                    it.cost = it.cost != null && !isNaN(Number(it.cost)) ? Number(it.cost) : 0;

                    // sku required
                    const skuValue = it.sku || it.product_sku || it.product_code;
                    if (!skuValue) {
                        await t.rollback();
                        return res.status(400).json({ success: false, message: 'sku (or product_sku/product_code) required for every item' });
                    }

                    // description: prefer product_name or construct from payload
                    if (!it.description) {
                        if (it.product_name) it.description = it.product_name;
                        else if (payload.type || payload.supplier) it.description = `${payload.type || 'grn'} ${payload.supplier || ''}`.trim();
                    }

                    // date: prefer line.date then GRN-level grn_date, normalize to YYYY-MM-DD
                    const dateRaw = it.date || payload.grn_date || payload.date;
                    if (dateRaw) {
                        const d = new Date(dateRaw);
                        if (isNaN(d.getTime())) {
                            await t.rollback();
                            return res.status(400).json({ success: false, message: `Invalid date for item: ${dateRaw}` });
                        }
                        it.date = d.toISOString().split('T')[0];
                    } else {
                        it.date = new Date().toISOString().split('T')[0];
                    }

                    // map warehouse into tags if provided
                    if (!it.tags && it.warehouse) it.tags = String(it.warehouse);

                    // map allowed model fields and rename fields to match model
                    const allowed = ['item_type','fk_id','sku','variant_id','batch_number','description','cost','date','qty','unit','tags','approver_id','status','createdBy','updatedBy','deletedBy'];
                    const entry = {};
                    for (const k of allowed) if (Object.prototype.hasOwnProperty.call(it, k)) entry[k] = it[k];

                    // ensure sku exists
                    if (!entry.sku) entry.sku = skuValue;
                    entry.fk_id = fk_id;
                    entry.item_type = it.item_type;

                    prepared.push(entry);
                }

                const created = await Stock.bulkCreate(prepared, { transaction: t, returning: true });
                await t.commit();
                return res.status(201).json({ success: true, data: created, message: `${created.length} stock records created` });
            } catch (innerErr) {
                await t.rollback();
                return res.status(500).json({ success: false, message: innerErr.message });
            }
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
            if (req.query.item_type) filters.item_type = req.query.item_type;
            if (req.query.fk_id) filters.fk_id = Number(req.query.fk_id);
            if (req.query.sku) filters.sku = req.query.sku;
            if (req.query.variant_id) filters.variant_id = req.query.variant_id;
            if (req.query.date) filters.date = req.query.date; // DATEONLY format: 2025-12-05

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
            const result = await StockRepo.getStocks({ page, limit, filters, order: [['createdAt', 'DESC']] });
            if (result.success) return res.status(200).json(result);
            // Log details for debugging when repository returns failure
            console.error('[StockController.getAll] repo returned error:', result.message || result);
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
            if (req.query.item_type) filters.item_type = req.query.item_type;
            if (req.query.fk_id) filters.fk_id = Number(req.query.fk_id);
            if (req.query.sku) filters.sku = req.query.sku;
            if (req.query.variant_id) filters.variant_id = req.query.variant_id;
            if (req.query.date) filters.date = req.query.date; // DATEONLY format: 2025-12-05

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

            const stocksResult = await StockRepo.getStocks({ page, limit, filters, order: [['createdAt', 'DESC']] });
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

    // GET /stock/statuses - return distinct status values present in stock records
    statuses: async (req, res) => {
        try {
            const statuses = await Stock.findAll({
                attributes: [[Stock.sequelize.fn('DISTINCT', Stock.sequelize.col('status')), 'status']],
                where: { status: { [Op.not]: null } },
                raw: true
            });
            const list = Array.isArray(statuses) ? statuses.map(s => s.status).filter(Boolean) : [];
            return res.status(200).json({ success: true, data: list });
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

    skus: async (req, res) => {
        try {
            const distinctSkus = await Stock.findAll({
                attributes: [
                    ['sku', 'sku']
                ],
                group: ['sku'],
                raw: true,
                order: [['sku', 'ASC']]
            });
            const list = (Array.isArray(distinctSkus) ? distinctSkus : []).map(item => item.sku).filter(s => s && s.trim());
            return res.status(200).json({ success: true, data: list });
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