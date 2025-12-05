import { Stock } from '../models/stock.model.js';
import { StockAdjustment } from '../models/stock-adjustment.model.js';
import { Op } from 'sequelize';

const StockRepo = {
    createStockEntry: async (stockData) => {
        try {
            const newStock = await Stock.create(stockData);
            return { success: true, data: newStock, message: 'Stock created successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getStocks: async ({ page = 1, limit = 20, filters = {}, order = [['createdAt', 'DESC']] } = {}) => {
        try {
            const offset = (page - 1) * limit;
            const where = { ...filters };
            
            // Support date field filters (DATEONLY: 2025-12-05)
            if (filters.date) {
                where.date = filters.date;
                delete where.date; // remove from where, then add back to avoid duplication
                where.date = filters.date;
            }
            
            // Support date range filters passed as start_date / end_date (ISO strings or DATEONLY)
            if (filters.start_date || filters.end_date) {
                const dateCond = {};
                if (filters.start_date) {
                    const sd = filters.start_date;
                    dateCond[Op.gte] = sd; // DATEONLY format: 2025-12-05
                }
                if (filters.end_date) {
                    const ed = filters.end_date;
                    dateCond[Op.lte] = ed; // DATEONLY format: 2025-12-05
                }
                if (Object.keys(dateCond).length > 0) {
                    where.date = dateCond;
                }
                // remove custom keys so Sequelize doesn't try to match them directly
                delete where.start_date;
                delete where.end_date;
            }
            // Ignore soft-deleted records by default (paranoid true). If caller passes status filter, keep it.
            const { rows: data, count: total } = await Stock.findAndCountAll({
                where,
                order,
                limit,
                offset
            });
            return {
                success: true,
                data,
                meta: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getStockById: async (id) => {
        try {
            const stock = await Stock.findByPk(id);
            if (!stock) return { success: false, message: 'Stock not found' };
            return { success: true, data: stock };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateStock: async (id, updateData) => {
        try {
            const stock = await Stock.findByPk(id);
            if (!stock) return { success: false, message: 'Stock not found' };

            // Prevent changing product_id accidentally unless explicitly provided
            if (!Object.prototype.hasOwnProperty.call(updateData, 'product_id')) {
                updateData.product_id = stock.product_id;
            }

            // Merge fields but preserve existing values when falsy values are not intended to override
            const allowedFields = ['description', 'cost', 'date', 'qty', 'unit', 'tags', 'approver_id', 'product_id', 'batch_number', 'updatedBy'];
            allowedFields.forEach(field => {
                if (updateData[field] === undefined) {
                    updateData[field] = stock[field];
                }
            });

            // Validate numeric fields
            if (updateData.qty != null && isNaN(Number(updateData.qty))) {
                return { success: false, message: 'Invalid qty value' };
            }
            if (updateData.cost != null && isNaN(Number(updateData.cost))) {
                return { success: false, message: 'Invalid cost value' };
            }

            await stock.update(updateData);
            return { success: true, data: stock, message: 'Stock updated successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateStockStatus: async (id, status) => {
        try {
            const stock = await Stock.findByPk(id);
            if (!stock) return { success: false, message: 'Stock not found' };
            await stock.update({ status });
            return { success: true, data: stock, message: 'Stock status updated successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Soft-delete: sets status='deleted' and lets paranoid handle deletedAt if needed
    deleteStock: async (id, deletedBy = null) => {
        try {
            const stock = await Stock.findByPk(id);
            if (!stock) return { success: false, message: 'Stock not found' };
            await stock.update({ status: 'deleted', deletedBy });
            await stock.destroy(); // with paranoid:true it sets deletedAt
            return { success: true, message: 'Stock soft-deleted successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Hard delete for admin
    hardDeleteStock: async (id) => {
        try {
            const stock = await Stock.findByPk(id, { paranoid: false });
            if (!stock) return { success: false, message: 'Stock not found' };
            await stock.destroy({ force: true });
            return { success: true, message: 'Stock permanently deleted' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    searchStocks: async ({ searchTerm = '', page = 1, limit = 20 } = {}) => {
        try {
            const offset = (page - 1) * limit;
            const where = {
                [Op.or]: [
                    { description: { [Op.iLike]: `%${searchTerm}%` } },
                    // include other searchable fields if exist
                ]
            };
            const { rows: data, count: total } = await Stock.findAndCountAll({
                where,
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });
            return {
                success: true,
                data,
                meta: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    ,

    // Aggregate current stock by product_id (sum of qty) and return product info when available
    getStockSummary: async () => {
        try {
            // Use raw query to aggregate quickly
            const sql = `SELECT s.product_id, SUM(s.qty) as total_qty
                FROM stock_records s
                WHERE s.status = 'active'
                GROUP BY s.product_id`;
            const [results] = await Stock.sequelize.query(sql, { type: Stock.sequelize.QueryTypes.SELECT });
            return { success: true, data: results };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Aggregate stock within a specific date range (inclusive). Accepts ISO strings or Date objects.
    getStockSummaryInRange: async ({ start_date, end_date, product_id = null } = {}) => {
        try {
            if (!start_date || !end_date) return { success: false, message: 'start_date and end_date required' };
            const start = (typeof start_date === 'string') ? new Date(start_date) : start_date;
            const end = (typeof end_date === 'string') ? new Date(end_date) : end_date;
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return { success: false, message: 'Invalid date range' };

            let sql = `SELECT s.product_id, SUM(s.qty) as total_qty FROM stock_records s WHERE s.status = 'active' AND s.created_at >= :start AND s.created_at <= :end`;
            const replacements = { start: start.toISOString(), end: end.toISOString() };
            if (product_id) {
                sql += ` AND s.product_id = :product_id`;
                replacements.product_id = Number(product_id);
            }
            sql += ` GROUP BY s.product_id`;
            const [rows] = await Stock.sequelize.query(sql, { replacements, type: Stock.sequelize.QueryTypes.SELECT });
            return { success: true, data: rows };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Create a stock adjustment record (positive or negative qty) with a note
    adjustStock: async ({ product_id, variant_id, qty, note = '', approver_id = null, createdBy = null }) => {
        try {
            // Resolve product_id if variant_id provided
            let pid = product_id;
            if ((!pid || pid === 0) && variant_id) {
                const prod = await Stock.sequelize.models.Product.findOne({ where: { variant_id } });
                if (!prod) return { success: false, message: 'Product (variant_id) not found' };
                pid = prod.id;
            }
            if (!pid) return { success: false, message: 'product_id or variant_id is required' };
            const rec = await Stock.create({ product_id: pid, qty, description: note, approver_id, createdBy });
            // create adjustment audit row
            try {
                await StockAdjustment.create({ stock_id: rec.id, product_id: pid, variant_id: variant_id || null, qty, note, adjusted_by: approver_id, createdBy });
            } catch (errAdj) {
                // non-fatal: log and continue
                console.error('[StockRepo] adjustStock - StockAdjustment create failed:', errAdj.message);
            }
            return { success: true, data: rec, message: 'Stock adjusted' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Convert materials into produced products: decrement materials, increment products
    convertMaterialsToProducts: async ({ materials = [], product_variant, produced_qty = 0, createdBy = null }) => {
        const t = await Stock.sequelize.transaction();
        try {
            if (!Array.isArray(materials) || materials.length === 0) return { success: false, message: 'materials required' };
            if (!product_variant) return { success: false, message: 'product_variant is required' };

            // Resolve produced product id
            const produced = await Stock.sequelize.models.Product.findOne({ where: { variant_id: product_variant }, transaction: t });
            if (!produced) { await t.rollback(); return { success: false, message: 'Produced product not found' }; }

            // For each material, resolve product and insert negative stock entry
            for (const m of materials) {
                const variant = m.variant_id || m.product_id;
                const qty = Number(m.qty || m.quantity || 0);
                if (!variant || qty <= 0) { await t.rollback(); return { success: false, message: 'Invalid material entry' }; }
                const mat = await Stock.sequelize.models.Product.findOne({ where: { variant_id: variant }, transaction: t });
                if (!mat) { await t.rollback(); return { success: false, message: `Material not found: ${variant}` }; }
                await Stock.create({ product_id: mat.id, qty: -Math.abs(qty), description: `Converted to ${product_variant}`, createdBy }, { transaction: t });
            }

            // Add produced product qty
            if (produced_qty > 0) {
                await Stock.create({ product_id: produced.id, qty: Number(produced_qty), description: `Produced from materials`, createdBy }, { transaction: t });
            }

            await t.commit();
            return { success: true, message: 'Conversion completed' };
        } catch (error) {
            await t.rollback();
            return { success: false, message: error.message };
        }
    },

    // Reduce stock when selling products (creates negative stock entries)
    sellProducts: async ({ items = [], createdBy = null }) => {
        const t = await Stock.sequelize.transaction();
        try {
            if (!Array.isArray(items) || items.length === 0) return { success: false, message: 'items required' };
            for (const it of items) {
                const variant = it.variant_id || it.product_id;
                const qty = Number(it.qty || it.quantity || 0);
                if (!variant || qty <= 0) { await t.rollback(); return { success: false, message: 'Invalid item entry' }; }
                const prod = await Stock.sequelize.models.Product.findOne({ where: { variant_id: variant }, transaction: t });
                if (!prod) { await t.rollback(); return { success: false, message: `Product not found: ${variant}` }; }
                await Stock.create({ product_id: prod.id, qty: -Math.abs(qty), description: `Sold via POS`, createdBy }, { transaction: t });
            }
            await t.commit();
            return { success: true, message: 'Stock updated for sale' };
        } catch (error) {
            await t.rollback();
            return { success: false, message: error.message };
        }
    }

    ,

    // Create or replace a monthly snapshot for a given year/month
    createMonthlySummary: async ({ year, month, createdBy = null } = {}) => {
        try {
            if (!year || !month) return { success: false, message: 'year and month required' };
            // compute last day of month
            const y = Number(year);
            const m = Number(month);
            const nextMonth = new Date(y, m, 1);
            const lastDay = new Date(nextMonth.getTime() - 1);
            const lastDayIso = lastDay.toISOString();

            // aggregate stock up to end of month (inclusive)
            const sql = `SELECT s.product_id, SUM(s.qty) as total_qty
                FROM stock_records s
                WHERE s.status = 'active' AND s.created_at <= :lastDay
                GROUP BY s.product_id`;
            const [rows] = await Stock.sequelize.query(sql, { replacements: { lastDay: lastDayIso }, type: Stock.sequelize.QueryTypes.SELECT });

            // remove existing entries for year/month
            await Stock.sequelize.models.StockMonthlySummary.destroy({ where: { year: y, month: m } });

            // bulk insert snapshot rows
            const toInsert = rows.map(r => ({ year: y, month: m, product_id: r.product_id, total_qty: Number(r.total_qty || 0), createdBy }));
            if (toInsert.length > 0) {
                await Stock.sequelize.models.StockMonthlySummary.bulkCreate(toInsert);
            }
            return { success: true, message: 'Monthly summary created', data: toInsert };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Fetch monthly snapshot rows for a given year/month
    getMonthlySummary: async ({ year, month } = {}) => {
        try {
            if (!year || !month) return { success: false, message: 'year and month required' };
            const rows = await Stock.sequelize.models.StockMonthlySummary.findAll({ where: { year: Number(year), month: Number(month) }, order: [['createdAt', 'DESC']] });
            return { success: true, data: rows };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Return the latest snapshot year/month or null
    getLatestSnapshotInfo: async () => {
        try {
            const row = await Stock.sequelize.models.StockMonthlySummary.findOne({ order: [['year', 'DESC'], ['month', 'DESC']] });
            if (!row) return { success: true, data: null };
            return { success: true, data: { year: row.year, month: row.month } };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Get stock summary using latest snapshot + deltas (if available)
    getStockSummaryWithSnapshot: async () => {
        try {
            // find latest snapshot
            const latest = await Stock.sequelize.models.StockMonthlySummary.findOne({ order: [['year', 'DESC'], ['month', 'DESC']] });
            if (!latest) {
                // fallback to full aggregation
                const sql = `SELECT s.product_id, SUM(s.qty) as total_qty FROM stock_records s WHERE s.status = 'active' GROUP BY s.product_id`;
                const [rows] = await Stock.sequelize.query(sql, { type: Stock.sequelize.QueryTypes.SELECT });
                return { success: true, data: rows };
            }

            // snapshot exists - compute snapshot date (end of month)
            const y = latest.year;
            const m = latest.month; // 1-12 assumed
            const nextMonth = new Date(y, m, 1);
            const snapshotEnd = new Date(nextMonth.getTime() - 1).toISOString();

            // aggregate deltas after snapshotEnd
            const deltaSql = `SELECT s.product_id, SUM(s.qty) as delta_qty FROM stock_records s WHERE s.status = 'active' AND s.created_at > :snapshotEnd GROUP BY s.product_id`;
            const [deltas] = await Stock.sequelize.query(deltaSql, { replacements: { snapshotEnd }, type: Stock.sequelize.QueryTypes.SELECT });

            // load snapshot rows
            const snapshotRows = await Stock.sequelize.models.StockMonthlySummary.findAll({ where: { year: y, month: m }, order: [['createdAt', 'DESC']] });
            const snapshotMap = new Map(snapshotRows.map(r => [r.product_id, Number(r.total_qty || 0)]));
            const deltaMap = new Map(deltas.map(d => [d.product_id, Number(d.delta_qty || 0)]));

            // combine
            const combined = new Map();
            for (const [pid, qty] of snapshotMap.entries()) combined.set(pid, qty);
            for (const [pid, dq] of deltaMap.entries()) combined.set(pid, (combined.get(pid) || 0) + dq);

            // also include any products present in deltas but not snapshot
            const result = Array.from(combined.entries()).map(([product_id, total_qty]) => ({ product_id, total_qty }));
            return { success: true, data: result };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    ,

    // Return a view for the last three months: include a snapshot (if available) taken before
    // the 3-month window, plus the ledger records for the last three months.
    getLastThreeMonthsView: async ({ asOf = null } = {}) => {
        try {
            const now = asOf ? new Date(asOf) : new Date();
            // compute start date 3 months ago (beginning of day)
            const start = new Date(now);
            start.setMonth(start.getMonth() - 3);
            start.setHours(0,0,0,0);

            const ym = (start.getFullYear() * 100) + (start.getMonth() + 1);

            // find latest snapshot with year/month <= ym
            const sqlFind = `SELECT year, month FROM stock_monthly_summaries WHERE (year*100 + month) <= :ym ORDER BY year DESC, month DESC LIMIT 1`;
            const [found] = await Stock.sequelize.query(sqlFind, { replacements: { ym }, type: Stock.sequelize.QueryTypes.SELECT });
            let snapshotInfo = null;
            let snapshotRows = [];
            if (found && found.year) {
                snapshotInfo = { year: Number(found.year), month: Number(found.month) };
                snapshotRows = await Stock.sequelize.models.StockMonthlySummary.findAll({ where: { year: snapshotInfo.year, month: snapshotInfo.month } });
            }

            // ledger records from start -> now
            const { Op } = require('sequelize');
            const records = await Stock.findAll({ where: { createdAt: { [Op.gte]: start, [Op.lte]: now }, status: 'active' }, order: [['id', 'DESC']] });

            return { success: true, data: { snapshotInfo, snapshotRows, start: start.toISOString(), end: now.toISOString(), records } };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Bulk create multiple stock entries at once
    bulkCreateStocks: async (stockDataArray = []) => {
        try {
            if (!Array.isArray(stockDataArray) || stockDataArray.length === 0) {
                return { success: false, message: 'stockDataArray must be a non-empty array' };
            }
            const created = await Stock.bulkCreate(stockDataArray, { returning: true });
            return { success: true, data: created, message: `${created.length} stock records created successfully` };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};

export default StockRepo;