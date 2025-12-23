import StockMonthlySummary from '../models/stock-summary.model.js';
import { Stock } from '../models/stock.model.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import StockRepo from '../repositories/stock.repository.js';

const StockSummaryController = {
  // GET /stock/monthly-summaries?year=2025&month=11
  // GET /stock/monthly-summaries/:year/:month
  list: async (req, res) => {
    try {
      const where = {};
      // Support both query params and route params
      const year = req.params.year ? Number(req.params.year) : (req.query.year ? Number(req.query.year) : null);
      const month = req.params.month ? Number(req.params.month) : (req.query.month ? Number(req.query.month) : null);
      const variant_id = req.params.variant_id ? Number(req.params.variant_id) : (req.query.variant_id ? Number(req.query.variant_id) : null);

      if (year && month) {
        const mm = String(month).padStart(2, '0');
        where.date = `${year}-${mm}-01`;
      }
      if (req.query.item_type) where.item_type = req.query.item_type;
      if (req.query.variant_id) where.variant_id = Number(req.query.variant_id);
      const rows = await StockMonthlySummary.findAll({ where, order: [['date', 'DESC'], ['item_type', 'ASC']] });
      return res.status(200).json({ success: true, data: rows });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  getById: async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const row = await StockMonthlySummary.findByPk(id);
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      return res.status(200).json({ success: true, data: row });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Get monthly summaries by SKU (with optional date range filtering)
  getBySku: async (req, res) => {
    try {
      console.log('GetBySku Called', req.params, req.query);
      const sku = req.params.sku ? String(req.params.sku).trim() : null;
      const start_year = req.query.start_year ? Number(req.query.start_year) : null;
      const start_month = req.query.start_month ? Number(req.query.start_month) : null;
      const end_year = req.query.end_year ? Number(req.query.end_year) : null;
      const end_month = req.query.end_month ? Number(req.query.end_month) : null;
      
      if (!sku) return res.status(400).json({ success: false, message: 'SKU is required' });

      // Build the date range object for the repository
      const dateRange = {};
      if (start_year && start_month) {
        dateRange.start_year = start_year;
        dateRange.start_month = start_month;
      }
      if (end_year && end_month) {
        dateRange.end_year = end_year;
        dateRange.end_month = end_month;
      }

      const result = await StockRepo.getStockViewBySku({ sku, ...dateRange });
      console.log('GetBySku [][][][] Result:===>>>>>', result);
      // Don't wrap result.data again - repository already returns { success, data }
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, query: { sku, start_year, start_month, end_year, end_month } });
      } else {
        return res.status(400).json({ success: false, message: result.message });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  create: async (req, res) => {
    try {
      const payload = req.body || {};
      // Expect date as YYYY-MM-DD or year+month
      if (!payload.date && payload.year && payload.month_number) {
        const m = String(payload.month_number).padStart(2, '0');
        payload.date = `${payload.year}-${m}-01`;
      }
      if (!payload.date) return res.status(400).json({ success: false, message: 'date required' });
      const created = await StockMonthlySummary.create(payload);
      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  ,

  // POST /stock/monthly-summaries/generate-from-last-month
  // Optional body/query: { year, month } to target a specific month
  generateFromLastMonth: async (req, res) => {
    try {
      let year = req.body?.year || req.query?.year || null;
      let month = req.body?.month || req.body?.month_number || req.query?.month || req.query?.month_number || null;
      const now = new Date();
      if (!year || !month) {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        year = prev.getFullYear();
        month = prev.getMonth() + 1;
      }
      year = Number(year);
      month = Number(month);
      if (!year || !month || month < 1 || month > 12) return res.status(400).json({ success: false, message: 'Invalid year/month' });

      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0); // last day of month
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      // Aggregate per item across stock_records
      const sql = `
        SELECT s.item_type, s.fk_id, s.sku, s.variant_id, s.item_name, s.unit,
          COALESCE(SUM(CASE WHEN s.date < :start THEN s.qty ELSE 0 END),0) AS opening_qty,
          COALESCE(SUM(CASE WHEN s.date >= :start AND s.date <= :end AND s.movement_type = 'IN' THEN s.qty ELSE 0 END),0) AS in_qty,
          COALESCE(SUM(CASE WHEN s.date >= :start AND s.date <= :end AND s.movement_type = 'OUT' THEN s.qty ELSE 0 END),0) AS out_qty,
          COALESCE(SUM(CASE WHEN s.date < :start THEN (COALESCE(s.cost,0) * COALESCE(s.qty,0)) ELSE 0 END),0) AS opening_value,
          COALESCE(SUM(CASE WHEN s.date >= :start AND s.date <= :end AND s.movement_type = 'IN' THEN (COALESCE(s.cost,0) * COALESCE(s.qty,0)) ELSE 0 END),0) AS in_value,
          COALESCE(SUM(CASE WHEN s.date >= :start AND s.date <= :end AND s.movement_type = 'OUT' THEN (COALESCE(s.cost,0) * COALESCE(s.qty,0)) ELSE 0 END),0) AS out_value
        FROM stock_records s
        WHERE s.date <= :end
        GROUP BY s.item_type, s.fk_id, s.sku, s.variant_id, s.item_name, s.unit
      `;

      const groups = await sequelize.query(sql, { replacements: { start: startStr, end: endStr }, type: sequelize.QueryTypes.SELECT });

      const results = [];
      const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
      for (const g of groups) {
        const opening_qty = Number(g.opening_qty || 0);
        const in_qty = Number(g.in_qty || 0);
        const out_qty = Number(g.out_qty || 0);
        const closing_qty = opening_qty + in_qty - out_qty;

        const opening_value = Number(g.opening_value || 0);
        const in_value = Number(g.in_value || 0);
        const out_value = Number(g.out_value || 0);
        const closing_value = opening_value + in_value - out_value;

        const payload = {
          month: monthDate,
          item_type: g.item_type,
          fk_id: Number(g.fk_id),
          sku: g.sku || null,
          variant_id: g.variant_id || null,
          item_name: g.item_name || null,
          opening_qty,
          in_qty,
          out_qty,
          closing_qty,
          opening_value,
          in_value,
          out_value,
          closing_value,
          unit: g.unit || null
        };

        // Upsert by month + item_type + fk_id
        const where = { month: monthDate, item_type: payload.item_type, fk_id: payload.fk_id };
        const existing = await StockMonthlySummary.findOne({ where });
        if (existing) {
          await existing.update(payload);
          results.push({ success: true, action: 'updated', id: existing.id, where });
        } else {
          const created = await StockMonthlySummary.create(payload);
          results.push({ success: true, action: 'created', id: created.id, where });
        }
      }

      return res.status(200).json({ success: true, month: monthDate, count: results.length, data: results });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  ,

  // POST /stock/monthly-summaries/generate-daily
  // body/query: { year, month, asOf } - if omitted, defaults to current year/month and today
  // Aggregates ledger rows from month start up to asOf and upserts into the monthly summary for that month.
  generateDailyForMonth: async (req, res) => {
    try {
      let year = req.body?.year || req.query?.year || null;
      let month = req.body?.month || req.body?.month_number || req.query?.month || req.query?.month_number || null;
      const asOfRaw = req.body?.asOf || req.body?.as_of || req.query?.asOf || req.query?.as_of || null;
      const now = new Date();
      if (!year || !month) {
        year = now.getFullYear();
        month = now.getMonth() + 1;
      }
      year = Number(year);
      month = Number(month);
      if (!year || !month || month < 1 || month > 12) return res.status(400).json({ success: false, message: 'Invalid year/month' });

      // asOf defaults to today or provided date (must be within month)
      const asOf = asOfRaw ? new Date(asOfRaw) : new Date();
      // normalize asOf to date-only
      const asOfStr = asOf.toISOString().split('T')[0];

      const start = new Date(year, month - 1, 1);
      const startStr = start.toISOString().split('T')[0];

      // Ensure asOf falls within the target month; if not, clamp to last day of month
      const lastDay = new Date(year, month, 0);
      let endDate = asOf;
      if (asOf < start) endDate = lastDay;
      if (asOf > lastDay) endDate = lastDay;
      const endStr = endDate.toISOString().split('T')[0];

      const sql = `
        SELECT s.item_type, s.fk_id, s.sku, s.variant_id, s.item_name, s.unit,
          COALESCE(SUM(CASE WHEN s.date < :start THEN s.qty ELSE 0 END),0) AS opening_qty,
          COALESCE(SUM(CASE WHEN s.date >= :start AND s.date <= :end AND s.movement_type = 'IN' THEN s.qty ELSE 0 END),0) AS in_qty,
          COALESCE(SUM(CASE WHEN s.date >= :start AND s.date <= :end AND s.movement_type = 'OUT' THEN s.qty ELSE 0 END),0) AS out_qty,
          COALESCE(SUM(CASE WHEN s.date < :start THEN (COALESCE(s.cost,0) * COALESCE(s.qty,0)) ELSE 0 END),0) AS opening_value,
          COALESCE(SUM(CASE WHEN s.date >= :start AND s.date <= :end AND s.movement_type = 'IN' THEN (COALESCE(s.cost,0) * COALESCE(s.qty,0)) ELSE 0 END),0) AS in_value,
          COALESCE(SUM(CASE WHEN s.date >= :start AND s.date <= :end AND s.movement_type = 'OUT' THEN (COALESCE(s.cost,0) * COALESCE(s.qty,0)) ELSE 0 END),0) AS out_value
        FROM stock_records s
        WHERE s.date <= :end
        GROUP BY s.item_type, s.fk_id, s.sku, s.variant_id, s.item_name, s.unit
      `;

      const groups = await sequelize.query(sql, { replacements: { start: startStr, end: endStr }, type: sequelize.QueryTypes.SELECT });

      const results = [];
      const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
      for (const g of groups) {
        const opening_qty = Number(g.opening_qty || 0);
        const in_qty = Number(g.in_qty || 0);
        const out_qty = Number(g.out_qty || 0);
        const closing_qty = opening_qty + in_qty - out_qty;

        const opening_value = Number(g.opening_value || 0);
        const in_value = Number(g.in_value || 0);
        const out_value = Number(g.out_value || 0);
        const closing_value = opening_value + in_value - out_value;

        const payload = {
          month: monthDate,
          item_type: g.item_type,
          fk_id: Number(g.fk_id),
          sku: g.sku || null,
          variant_id: g.variant_id || null,
          item_name: g.item_name || null,
          opening_qty,
          in_qty,
          out_qty,
          closing_qty,
          opening_value,
          in_value,
          out_value,
          closing_value,
          unit: g.unit || null
        };

        const where = { month: monthDate, item_type: payload.item_type, fk_id: payload.fk_id };
        const existing = await StockMonthlySummary.findOne({ where });
        if (existing) {
          await existing.update(payload);
          results.push({ success: true, action: 'updated', id: existing.id, where });
        } else {
          const created = await StockMonthlySummary.create(payload);
          results.push({ success: true, action: 'created', id: created.id, where });
        }
      }

      return res.status(200).json({ success: true, month: monthDate, asOf: endStr, count: results.length, data: results });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  ,

  // PATCH /stock/monthly-summaries/:id
  update: async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const payload = req.body || {};
      const row = await StockMonthlySummary.findByPk(id);
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      // Prevent changing primary identifying fields in an unsafe way; allow updating numeric totals and metadata
      const allowed = ['opening_qty', 'in_qty', 'out_qty', 'closing_qty', 'opening_value', 'in_value', 'out_value', 'closing_value', 'unit', 'item_name', 'sku', 'variant_id', 'createdBy'];
      const updates = {};
      for (const key of allowed) if (Object.prototype.hasOwnProperty.call(payload, key)) updates[key] = payload[key];
      await row.update(updates);
      return res.status(200).json({ success: true, data: row, message: 'updated' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /stock/monthly-summaries/bulk-upsert  body: { items: [...] }
  bulkUpsert: async (req, res) => {
    try {
      const items = Array.isArray(req.body) ? req.body : (Array.isArray(req.body.items) ? req.body.items : []);
      if (!items.length) return res.status(400).json({ success: false, message: 'items array required' });
      const results = [];
      for (const itRaw of items) {
        const it = { ...itRaw };
        // normalize month if year+month provided
        if (!it.month && it.year && (it.month_number || it.month)) {
          const mn = String(it.month_number || it.month).padStart(2, '0');
          it.month = `${it.year}-${mn}-01`;
        }
        if (!it.month || !it.item_type || (it.fk_id == null)) {
          results.push({ success: false, message: 'month,item_type,fk_id required', payload: it });
          continue;
        }
        const where = { month: it.month, item_type: it.item_type, fk_id: Number(it.fk_id) };
        const existing = await StockMonthlySummary.findOne({ where });
        if (existing) {
          const updates = { ...it };
          // don't overwrite id
          delete updates.id;
          await existing.update(updates);
          results.push({ success: true, action: 'updated', id: existing.id, where });
        } else {
          const created = await StockMonthlySummary.create(it);
          results.push({ success: true, action: 'created', id: created.id, where });
        }
      }
      return res.status(200).json({ success: true, data: results });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default StockSummaryController;
