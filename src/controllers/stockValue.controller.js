import StockCurrentValue from '../models/stock-current-value.model.js';
import { Stock } from '../models/stock.model.js';

const StockValueController = {
  // GET /stock/current-values?item_type=PRODUCT&fk_id=123
  list: async (req, res) => {
    try {
      const where = {};
      if (req.query.item_type) where.item_type = req.query.item_type;
      if (req.query.fk_id) where.fk_id = Number(req.query.fk_id);
      const rows = await StockCurrentValue.findAll({ where, order: [['id', 'ASC']] });
      return res.status(200).json({ success: true, data: rows });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /stock/current-values/:item_type/:fk_id
  getByItem: async (req, res) => {
    try {
      const { item_type, fk_id } = req.params;
      if (!item_type || !fk_id) return res.status(400).json({ success: false, message: 'Missing parameters' });
      const row = await StockCurrentValue.findOne({ where: { item_type, fk_id: Number(fk_id) } });
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      return res.status(200).json({ success: true, data: row });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /stock/current-values/upsert  body: { item_type, fk_id, current_value, unit }
  upsert: async (req, res) => {
    try {
      const payload = req.body || {};
      const { item_type, fk_id } = payload;
      if (!item_type || !fk_id) return res.status(400).json({ success: false, message: 'item_type and fk_id required' });
      const values = { current_value: payload.current_value || 0, unit: payload.unit || null, createdBy: payload.createdBy || null };
      const existing = await StockCurrentValue.findOne({ where: { item_type, fk_id: Number(fk_id) } });
      if (existing) {
        await existing.update(values);
        return res.status(200).json({ success: true, data: existing, message: 'updated' });
      }
      const created = await StockCurrentValue.create({ item_type, fk_id: Number(fk_id), ...values });
      return res.status(201).json({ success: true, data: created, message: 'created' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
,

  // POST /stock/current-values/refresh  body/query: { item_type, fk_id }
  // If item_type+fk_id provided -> compute value for that item only.
  // If omitted -> compute grouped sums for all items and upsert each.
  refresh: async (req, res) => {
    try {
      const item_type = req.body?.item_type || req.query?.item_type || null;
      const fk_id = req.body?.fk_id || req.query?.fk_id || null;
      if (item_type && fk_id) {
        // single item aggregate
        const row = await Stock.findOne({
          attributes: [[Stock.sequelize.fn('SUM', Stock.sequelize.literal('qty * cost')), 'total_value']],
          where: { item_type, fk_id: Number(fk_id) },
          raw: true,
        });
        const total = parseFloat(row?.total_value || 0);
        const existing = await StockCurrentValue.findOne({ where: { item_type, fk_id: Number(fk_id) } });
        if (existing) {
          await existing.update({ current_value: total });
          return res.status(200).json({ success: true, data: existing, message: 'updated' });
        }
        const created = await StockCurrentValue.create({ item_type, fk_id: Number(fk_id), current_value: total });
        return res.status(201).json({ success: true, data: created, message: 'created' });
      }

      // full refresh: aggregate grouped by item_type, fk_id
      const groups = await Stock.findAll({
        attributes: [
          'item_type',
          'fk_id',
          [Stock.sequelize.fn('SUM', Stock.sequelize.literal('qty * cost')), 'total_value'],
        ],
        group: ['item_type', 'fk_id'],
        raw: true,
      });

      const upserted = [];
      for (const g of groups) {
        const it = g.item_type;
        const id = Number(g.fk_id);
        const total = parseFloat(g.total_value || 0);
        const existing = await StockCurrentValue.findOne({ where: { item_type: it, fk_id: id } });
        if (existing) {
          await existing.update({ current_value: total });
          upserted.push({ item_type: it, fk_id: id, action: 'updated' });
        } else {
          await StockCurrentValue.create({ item_type: it, fk_id: id, current_value: total });
          upserted.push({ item_type: it, fk_id: id, action: 'created' });
        }
      }
      return res.status(200).json({ success: true, data: upserted });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default StockValueController;
