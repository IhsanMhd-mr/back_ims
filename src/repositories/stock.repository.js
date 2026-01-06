import { Stock, refreshCurrentValue, refreshCurrentValueBulk } from '../models/stock.model.js';
import { StockAdjustment } from '../models/stock-adjustment.model.js';
import { Op } from 'sequelize';

const StockRepo = {
    createStockEntry: async (stockData) => {
        try {
            const newStock = await Stock.create(stockData);
            // Refresh current value for this item
            await refreshCurrentValue(newStock).catch(err => console.error('Refresh error:', err));
            return { success: true, data: newStock, message: 'Stock created successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    bulkCreateStockEntries: async (stockDataArray, options = {}) => {
        try {
            if (!Array.isArray(stockDataArray) || !stockDataArray.length) {
                return { success: false, message: 'stockDataArray required' };
            }

            console.log(`[StockRepo] Bulk create: ${stockDataArray.length} records`);
            const bulkOptions = { returning: true, validate: true };
            if (options.transaction) {
                bulkOptions.transaction = options.transaction;
            }
            const createdStocks = await Stock.bulkCreate(stockDataArray, bulkOptions);
            console.log(`[StockRepo] ✅ Success: ${createdStocks.length} created`);
            // Refresh current values for all affected items
            await refreshCurrentValueBulk(createdStocks).catch(err => console.error('Refresh error:', err));
            return { success: true, data: createdStocks, message: `${createdStocks.length} stock records created` };
        } catch (error) {
            console.error(`[StockRepo] Bulk create ERROR:`);
            console.error(`├─ Message: ${error.message}`);
            console.error(`├─ Code: ${error.code}`);
            console.error(`├─ Name: ${error.name}`);
            console.error(`└─ Details: ${JSON.stringify(error.errors || error.original || 'N/A')}`);
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
            const allowedFields = ['description', 'cost', 'date', 'qty', 'unit', 'tags', 'approver_id', 'product_id', 'batch_number', 'updatedBy', 'movement_type', 'source'];
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

    // Soft-delete: sets status='DELETED' and lets paranoid handle deletedAt if needed
    deleteStock: async (id, deletedBy = null) => {
        try {
            const stock = await Stock.findByPk(id);
            if (!stock) return { success: false, message: 'Stock record not found' };
            await stock.update({ status: 'DELETED', deletedBy });
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


    getSKUlist: async () => {
        try {
            const data = await Stock.findAll({
                attributes: [
                    'sku',
                    'item_type',
                    'item_name'
                ],
                group: ['sku', 'item_type', 'item_name']
            });

            return {
                success: true,
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    },

    // Get grouped SKU list for summary with aggregated stock quantities
    getSKUlistForSummary: async ({ itemType = null, source = null, movement_type = null, year = null, month = null } = {}) => {
        try {
            const where = {};
            if (itemType) where.item_type = itemType;
            if (source) where.source = source;
            if (movement_type) where.movement_type = movement_type;

            // Date filtering
            if (year || month) {
                const sequelize = Stock.sequelize;
                const yearCond = year ? sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM date')), Op.eq, year) : null;
                const monthCond = month ? sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM date')), Op.eq, month) : null;
                const dateConds = [yearCond, monthCond].filter(Boolean);
                if (dateConds.length > 0) {
                    where[Op.and] = dateConds;
                }
            }

            // Get unique SKUs only (one row per SKU, aggregated across sources/movements)
            const records = await Stock.findAll({
                attributes: [
                    'sku',
                    [Stock.sequelize.fn('MIN', Stock.sequelize.col('item_type')), 'item_type'],
                    [Stock.sequelize.fn('MIN', Stock.sequelize.col('item_name')), 'item_name'],
                    [Stock.sequelize.fn('COUNT', Stock.sequelize.col('id')), 'transaction_count'],
                    [Stock.sequelize.fn('SUM', Stock.sequelize.col('qty')), 'total_quantity'],
                    [Stock.sequelize.fn('AVG', Stock.sequelize.col('cost')), 'avg_cost']
                ],
                where,
                group: ['sku'],
                raw: true,
                subQuery: false,
                order: [[Stock.sequelize.literal('transaction_count'), 'DESC']]
            });

            return {
                success: true,
                data: records,
                meta: {
                    total: records.length,
                    filters: { itemType, source, movement_type, year, month }
                }
            };
        } catch (error) {
            console.error('[StockRepo] getSKUlistForSummary ERROR:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    },

    // Get all variants (fk_id + details) for a grouped SKU
    getVariantsByGroupedSKU: async ({ sku, itemType = null } = {}) => {
        try {
            if (!sku) {
                return { success: false, message: 'SKU is required' };
            }

            const where = { sku };
            if (itemType) where.item_type = itemType;

            const variants = await Stock.findAll({
                attributes: [
                    'id',
                    'fk_id',
                    'sku',
                    'item_type',
                    'item_name',
                    'quantity',
                    'cost',
                    'source',
                    'movement_type',
                    'status',
                    'date',
                    'batch_number'
                ],
                where,
                order: [['createdAt', 'DESC']],
                raw: true
            });

            // Group by fk_id to show unique variants
            const groupedByVariant = {};
            variants.forEach(v => {
                if (!groupedByVariant[v.fk_id]) {
                    groupedByVariant[v.fk_id] = {
                        fk_id: v.fk_id,
                        sku: v.sku,
                        item_type: v.item_type,
                        item_name: v.item_name,
                        latest_date: v.date,
                        latest_status: v.status,
                        cost: v.cost,
                        records_count: 0,
                        latest_batch: v.batch_number
                    };
                }
                groupedByVariant[v.fk_id].records_count += 1;
            });

            const uniqueVariants = Object.values(groupedByVariant);

            return {
                success: true,
                data: uniqueVariants,
                meta: {
                    total: uniqueVariants.length,
                    sku,
                    itemType,
                    total_transactions: variants.length
                }
            };
        } catch (error) {
            console.error('[StockRepo] getVariantsByGroupedSKU ERROR:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }
    ,
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
                WHERE s.status = 'ACTIVE'
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

            let sql = `SELECT s.product_id, SUM(s.qty) as total_qty FROM stock_records s WHERE s.status = 'ACTIVE' AND s.created_at >= :start AND s.created_at <= :end`;
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
    adjustStock: async ({ product_id, variant_id, qty, note = '', approver_id = null, createdBy = null, movement_type = 'IN', source = 'ADJUSTMENT' }) => {
        try {
            // Resolve product_id if variant_id provided
            let pid = product_id;
            if ((!pid || pid === 0) && variant_id) {
                const prod = await Stock.sequelize.models.Product.findOne({ where: { variant_id } });
                if (!prod) return { success: false, message: 'Product (variant_id) not found' };
                pid = prod.id;
            }
            if (!pid) return { success: false, message: 'product_id or variant_id is required' };
            const rec = await Stock.create({ product_id: pid, qty, description: note, approver_id, createdBy, movement_type, source });
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
                await Stock.create({ product_id: mat.id, qty: -Math.abs(qty), description: `Converted to ${product_variant}`, createdBy, movement_type: 'OUT', source: 'ADJUSTMENT' }, { transaction: t });
            }

            // Add produced product qty
            if (produced_qty > 0) {
                await Stock.create({ product_id: produced.id, qty: Number(produced_qty), description: `Produced from materials`, createdBy, movement_type: 'IN', source: 'ADJUSTMENT' }, { transaction: t });
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
                await Stock.create({ product_id: prod.id, qty: -Math.abs(qty), description: `Sold via POS`, createdBy, movement_type: 'OUT', source: 'SALES' }, { transaction: t });
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
                WHERE s.status = 'ACTIVE' AND s.created_at <= :lastDay
                GROUP BY s.product_id`;
            const [rows] = await Stock.sequelize.query(sql, { replacements: { lastDay: lastDayIso }, type: Stock.sequelize.QueryTypes.SELECT });

            // remove existing entries for year/month
            await Stock.sequelize.models.StockMonthlySummary.destroy({ where: { year: y, date: m } });

            // bulk insert snapshot rows
            const toInsert = rows.map(r => ({ year: y, date: m, product_id: r.product_id, total_qty: Number(r.total_qty || 0), createdBy }));
            if (toInsert.length > 0) {
                await Stock.sequelize.models.StockMonthlySummary.bulkCreate(toInsert);
            }
            return { success: true, message: 'Monthly summary created', data: toInsert };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getStockSKURecords: async (where) => {
        try {
            const { sku, year, month } = where;
            const filter = { sku: sku };
            if (year && month) {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0);
                filter.date = {
                    [Op.between]: [startDate, endDate]
                };
            }
            const records = await Stock.findAll({ where: filter, order: [['date', 'DESC']] });
            return { success: true, data: records };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Fetch monthly snapshot rows for a given year/month
    getMonthlySKUSummary: async (where) => {
        try {
            const { sku, year, month } = where;
            const filter = { sku: sku };
            if (year && month) {
                const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
                filter.date = monthDate;
            }
            const summaries = await Stock.sequelize.models.StockMonthlySummary.findAll({ where: filter, order: [['date', 'DESC']] });
            return { success: true, data: summaries };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getStockViewBySku: async ({ sku, start_year, start_month, end_year, end_month }) => {
        try {
            console.log('getStockViewBySku Params:<><><><><><><>', { sku, start_year, start_month, end_year, end_month });
            if (!sku) {
                return { success: false, message: 'SKU is required' };
            }

            const startDate = new Date(start_year, start_month - 1, 1);
            const endDate = new Date(end_year, end_month, 1);

            // STEP A: Find opening balance from the previous month's summary

            const openingSummary = await Stock.sequelize.models.StockMonthlySummary.findOne({
                where: {
                    sku,
                    date: { [Op.lt]: startDate }

                }
            });
            console.log('Opening Summary------>>>>>>>>>:', openingSummary);
            let opening_qty = 0;
            let opening_value = 0;
            if (openingSummary) {
                opening_qty = Number(openingSummary.closing_qty) || 0;
                opening_value = Number(openingSummary.closing_value) || 0;
            }
            console.log('Opening Qty & Value------>>>>>>>>>:', opening_qty, opening_value);
            // STEP B: Get movements for the current month





            const transactions = await Stock.findAll({
                where: {
                    sku,
                    date: { [Op.gte]: startDate, [Op.lt]: endDate }
                },
                attributes: ['id', 'date', 'movement_type', 'source', 'qty', 'batch_number', 'cost'],
                order: [['date', 'desc'], ['id', 'desc']]
            });


            // Get item details from the first available source
            const itemDetails = await Stock.findOne({ where: { sku } }) || await Stock.sequelize.models.StockMonthlySummary.findOne({ where: { sku } });

            const transactionsList = [];

            // Add opening balance as first transaction
            if (opening_qty !== 0 || opening_value !== 0) {
                transactionsList.push({
                    // id: openingSummary ? openingSummary.id : null||'00',
                    id: parseInt('00'),
                    date: new Date(startDate.getFullYear(), startDate.getMonth(), 0).toISOString().split('T')[0], // last day of previous month
                    movement_type: 'IN',
                    source: 'opening_balance',
                    qty: openingSummary.closing_qty, //balance of the previous month
                    batch_number: openingSummary ? `stock_summary-${openingSummary.id}` : null
                });
            }

            // Add actual transactions
            transactionsList.push(...transactions.map(t => ({
                id: t.id,
                date: t.date,
                movement_type: t.movement_type,
                source: t.source,
                qty: t.qty,
                batch_number: t.batch_number
            })));
            // STEP C: Get all transactions for the period for the response

            const response = {
                item: {
                    sku: sku,
                    item_name: itemDetails?.item_name || null,
                    unit: itemDetails?.unit || null,
                    item_type: itemDetails?.item_type || null
                },
                period: {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0]
                },
                transactions: transactionsList,
                // summary: {
                //     opening_qty,
                //     in_qty,
                //     out_qty,
                //     closing_qty,
                //     opening_value,
                //     in_value,
                //     out_value,
                //     closing_value
                // }
            };

            return { success: true, data: response };
        } catch (error) {
            console.error('[StockRepo] getStockViewBySku ERROR:', error);
            return { success: false, message: error.message };
        }
    },


    getStackedStockView: async ({ sku = null, start_year, start_month, end_year, end_month }) => {
        try {
            console.log('getStackedStockView Params:<><><><><><><>', { sku, start_year, start_month, end_year, end_month });
            let skuListResult = await StockRepo.getSKUlist();
            let skuList = skuListResult.data;
            
            // Filter by SKU if provided
            if (sku) {
                skuList = skuList.filter(item => (item.dataValues?.sku || item.sku) === sku);
            }
            
            console.log('SKU LIST------>>>>>>>>>:', skuList);

            const startDate = new Date(start_year, start_month - 1, 1);
            const endDate = new Date(end_year, end_month, 1);

            // STEP A: Find opening balance from the previous month's summary


            let opening_qty = 0;
            let opening_value = 0;
            let response = {};
            let transactionsListStacked = [];

            for (const instance of skuList) {
                let sku = instance.dataValues?.sku || instance.sku;
                
                const openingSummary = await Stock.sequelize.models.StockMonthlySummary.findOne({
                    where: {
                        sku: sku,
                        date: { [Op.lt]: startDate }
                    },
                    order: [['date', 'DESC']]
                });
                
                console.log(`\n📦 Processing SKU: ${sku}`);
                console.log('📊 Opening Summary Found:', openingSummary ? `✅ (closing_qty: ${openingSummary.closing_qty}, closing_value: ${openingSummary.closing_value})` : '❌ None');
                
                // Reset for each SKU
                opening_qty = 0;
                opening_value = 0;
                if (openingSummary) {
                    opening_qty = Number(openingSummary.closing_qty) || 0;
                    opening_value = Number(openingSummary.closing_value) || 0;
                }

                console.log(`💰 Opening Balance: Qty=${opening_qty}, Value=${opening_value}`);
                
                // STEP B: Get movements for the current month

                const transactions = await Stock.findAll({
                    where: {
                        sku,
                        date: { [Op.gte]: startDate, [Op.lt]: endDate }
                    },
                    attributes: ['id', 'date', 'movement_type', 'source', 'qty', 'batch_number', 'cost'],
                    order: [['date', 'desc'], ['id', 'desc']]
                });

                console.log(`📋 Transactions Found: ${transactions?.length || 0} records`);

                // Get item details from the first available source
                const itemDetails = await Stock.findOne({ where: { sku } }) || await Stock.sequelize.models.StockMonthlySummary.findOne({ where: { sku } });

                const transactionsList = [];

                // Add opening balance as first transaction
                if (openingSummary && (opening_qty !== 0 || opening_value !== 0)) {
                    transactionsList.push({
                        id: 0,
                        date: new Date(startDate.getFullYear(), startDate.getMonth(), 0).toISOString().split('T')[0],
                        movement_type: 'IN',
                        source: 'opening_balance',
                        qty: opening_qty,
                        batch_number: `stock_summary-${openingSummary.id}`
                    });
                    console.log(`  ➕ Added opening balance transaction`);
                }

                // Add actual transactions
                if (Array.isArray(transactions) && transactions.length > 0) {
                    transactionsList.push(...transactions.map(t => ({
                    id: t.id,
                    date: t.date,
                    movement_type: t.movement_type,
                    source: t.source,
                    qty: t.qty,
                    batch_number: t.batch_number
                })));
                    console.log(`  ➕ Added ${transactions.length} transaction records`);
                }
                
                console.log(`✅ Total transactions for ${sku}: ${transactionsList.length}\n`);
                
                // STEP C: Get all transactions for the period for the response

                response = {
                    item: {
                        sku: sku,
                        item_name: itemDetails?.item_name || null,
                        unit: itemDetails?.unit || null,
                        item_type: itemDetails?.item_type || null
                    },
                    stock_records: transactionsList,
                };

                transactionsListStacked.push(response);


            }
            
            console.log(`\n🎯 Stacked Response Summary: ${transactionsListStacked.length} SKUs processed`);
            
            let stacked_response = {

                period: {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0]
                },
                transactions: transactionsListStacked,

            }

            return { success: true, data: stacked_response };
        } catch (error) {
            console.error('[StockRepo] getStockViewBySku ERROR:', error);
            return { success: false, message: error.message };
        }
    },

    // Return the latest snapshot date or null
    getLatestSnapshotInfo: async () => {
        try {
            const row = await Stock.sequelize.models.StockMonthlySummary.findOne({ order: [['date', 'DESC']] });
            if (!row) return { success: true, data: null };
            // Extract year and month from date (YYYY-MM-DD format)
            const dateObj = new Date(row.date);
            return { success: true, data: { year: dateObj.getFullYear(), date: dateObj.getMonth() + 1, date: row.date } };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // Get stock summary using latest snapshot + deltas (if available)
    getStockSummaryWithSnapshot: async () => {
        try {
            // find latest snapshot
            const latest = await Stock.sequelize.models.StockMonthlySummary.findOne({ order: [['date', 'DESC']] });
            if (!latest) {
                // fallback to full aggregation
                const sql = `SELECT s.product_id, SUM(s.qty) as total_qty FROM stock_records s WHERE s.status = 'ACTIVE' GROUP BY s.product_id`;
                const [rows] = await Stock.sequelize.query(sql, { type: Stock.sequelize.QueryTypes.SELECT });
                return { success: true, data: rows };
            }

            // snapshot exists - compute snapshot date (end of month)
            const dateObj = new Date(latest.date);
            const y = dateObj.getFullYear();
            const m = dateObj.getMonth() + 1; // 1-12
            const nextMonth = new Date(y, m, 1);
            const snapshotEnd = new Date(nextMonth.getTime() - 1).toISOString();

            // aggregate deltas after snapshotEnd
            const deltaSql = `SELECT s.product_id, SUM(s.qty) as delta_qty FROM stock_records s WHERE s.status = 'ACTIVE' AND s.created_at > :snapshotEnd GROUP BY s.product_id`;
            const [deltas] = await Stock.sequelize.query(deltaSql, { replacements: { snapshotEnd }, type: Stock.sequelize.QueryTypes.SELECT });

            // load snapshot rows
            const snapshotRows = await Stock.sequelize.models.StockMonthlySummary.findAll({ where: { date: latest.date }, order: [['createdAt', 'DESC']] });
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
            start.setHours(0, 0, 0, 0);

            const ym = (start.getFullYear() * 100) + (start.getMonth() + 1);

            // find latest snapshot with date <= ym (convert date to YYYYMM format)
            const sqlFind = `SELECT date FROM stock_monthly_summaries WHERE (YEAR(date)*100 + MONTH(date)) <= :ym ORDER BY date DESC LIMIT 1`;
            const [found] = await Stock.sequelize.query(sqlFind, { replacements: { ym }, type: Stock.sequelize.QueryTypes.SELECT });
            let snapshotInfo = null;
            let snapshotRows = [];
            if (found && found.date) {
                const dateObj = new Date(found.date);
                snapshotInfo = { year: dateObj.getFullYear(), date: dateObj.getMonth() + 1, date: found.date };
                snapshotRows = await Stock.sequelize.models.StockMonthlySummary.findAll({ where: { date: found.date } });
            }

            // ledger records from start -> now
            const { Op } = require('sequelize');
            const records = await Stock.findAll({ where: { createdAt: { [Op.gte]: start, [Op.lte]: now }, status: 'ACTIVE' }, order: [['id', 'DESC']] });

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
    },

    // Item Monthly Summary - Grouped by variant/item with monthly data
    // TODO: Implement specific logic as per requirements
    getItemMonthlySummary: async ({ year = null, month = null, itemType = null, page = 1, limit = 20 } = {}) => {
        try {
            const offset = (page - 1) * limit;
            // Placeholder implementation - to be completed with specific business logic
            return {
                success: true,
                data: [],
                meta: { total: 0, page, limit, pages: 0 },
                message: 'Item monthly summary endpoint (implementation pending)'
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },


    /**
     * Get monthly totals (IN and OUT qty) for a specific month
     * Supports: single SKU (all variants), or specific variant
     */
    getMonthlyTotals: async ({ sku = null, variant_id = null, month, year }) => {
        try {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            let where = {
                date: { [Op.gte]: startDate, [Op.lte]: endDate },
                status: 'ACTIVE',
                movement_type: { [Op.in]: ['IN', 'OUT'] }
            };

            if (variant_id) {
                where.variant_id = variant_id;
            } else if (sku) {
                where.sku = sku;
            }

            const records = await Stock.findAll({ where, raw: true });

            let total_in = 0;
            let total_out = 0;

            records.forEach(record => {
                const qty = Number(record.qty || 0);
                if (record.movement_type === 'IN') {
                    total_in += qty;
                } else if (record.movement_type === 'OUT') {
                    total_out += qty;
                }
            });

            return { success: true, data: { total_in, total_out } };
        } catch (error) {
            console.error('Error in getMonthlyTotals:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Get opening stock for a period (all transactions BEFORE a specific month)
     * Calculates: SUM(IN qty) - SUM(OUT qty) before the month
     */
    getOpeningStock: async ({ sku = null, variant_id = null, month, year }) => {
        try {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

            let where = {
                date: { [Op.lt]: startDate },
                status: 'ACTIVE',
                movement_type: { [Op.in]: ['IN', 'OUT'] }
            };

            if (variant_id) {
                where.variant_id = variant_id;
            } else if (sku) {
                where.sku = sku;
            }

            const records = await Stock.findAll({ where, raw: true });

            let opening_stock = 0;

            records.forEach(record => {
                const qty = Number(record.qty || 0);
                if (record.movement_type === 'IN') {
                    opening_stock += qty;
                } else if (record.movement_type === 'OUT') {
                    opening_stock -= qty;
                }
            });

            return { success: true, opening_stock: Math.max(0, opening_stock) };
        } catch (error) {
            console.error('Error in getOpeningStock:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Get item details (item_type, fk_id, item_name, unit) from stock records
     * Used for generating monthly summaries with required fields
     */
    getItemDetails: async ({ sku = null, variant_id = null }) => {
        try {
            let where = { status: 'ACTIVE' };

            if (variant_id) {
                where.variant_id = variant_id;
            } else if (sku) {
                where.sku = sku;
            } else {
                return { success: false, message: 'sku or variant_id is required' };
            }

            const record = await Stock.findOne({
                where,
                attributes: ['item_type', 'fk_id', 'item_name', 'unit', 'sku', 'variant_id'],
                raw: true
            });

            if (!record) {
                return { success: false, message: 'Item not found' };
            }

            return { success: true, data: record };
        } catch (error) {
            console.error('Error in getItemDetails:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Get all distinct SKUs from stock records
     * SELECT DISTINCT sku FROM stock WHERE status = 'ACTIVE'
     */
    getDistinctSKUs: async () => {
        try {
            const records = await Stock.findAll({
                attributes: ['sku'],
                where: { status: 'ACTIVE', sku: { [Op.ne]: null } },
                group: ['sku'],
                raw: true
            });

            const skus = records.map(r => r.sku);
            return { success: true, data: skus };
        } catch (error) {
            console.error('Error in getDistinctSKUs:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Get all distinct variants for a specific SKU
     * SELECT DISTINCT variant_id FROM stock WHERE sku = ? AND status = 'ACTIVE'
     */
    getVariantsBySKU: async (sku) => {
        try {
            const records = await Stock.findAll({
                attributes: ['variant_id'],
                where: { sku, status: 'ACTIVE' },
                group: ['variant_id'],
                raw: true
            });

            const variants = records.map(r => r.variant_id);
            return { success: true, data: variants };
        } catch (error) {
            console.error('Error in getVariantsBySKU:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Check if stock records exist for a given item up to a specific date
     * Used to prevent creating empty summaries for items with no stock history
     * 
     * @param {Object} params - { sku, variant_id, beforeDate (optional) }
     * @returns {Object} - { success, exists, count, firstRecordDate, lastRecordDate }
     */
    hasStockRecords: async ({ sku = null, variant_id = null, beforeDate = null }) => {
        try {
            let where = { status: 'ACTIVE' };

            if (variant_id) {
                where.variant_id = variant_id;
            } else if (sku) {
                where.sku = sku;
            } else {
                return { success: false, message: 'sku or variant_id is required' };
            }

            // If beforeDate provided, only check records before that date
            if (beforeDate) {
                where.date = { [Op.lte]: beforeDate };
            }

            const count = await Stock.count({ where });

            if (count === 0) {
                return { 
                    success: true, 
                    exists: false, 
                    count: 0,
                    message: 'No stock records found for this item'
                };
            }

            // Get first and last record dates for more info
            const firstRecord = await Stock.findOne({
                where: { ...where, date: beforeDate ? { [Op.lte]: beforeDate } : { [Op.ne]: null } },
                order: [['date', 'ASC']],
                attributes: ['date'],
                raw: true
            });

            const lastRecord = await Stock.findOne({
                where: { ...where, date: beforeDate ? { [Op.lte]: beforeDate } : { [Op.ne]: null } },
                order: [['date', 'DESC']],
                attributes: ['date'],
                raw: true
            });

            return { 
                success: true, 
                exists: true, 
                count,
                firstRecordDate: firstRecord?.date,
                lastRecordDate: lastRecord?.date
            };
        } catch (error) {
            console.error('Error in hasStockRecords:', error);
            return { success: false, message: error.message };
        }
    }
};


export default StockRepo;