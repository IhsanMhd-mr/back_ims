import { StockMonthlySummary } from '../models/stock-summary.model.js';
import { Stock } from '../models/stock.model.js';
import { Op } from 'sequelize';

const StockSummaryRepo = {
    // ============================================
    // CRUD Operations
    // ============================================
    
    createStockSummaryEntry: async (stockSummaryData) => {
        try {
            const newStockSummary = await StockMonthlySummary.create(stockSummaryData);
            return { success: true, data: newStockSummary, message: 'StockSummary created successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    bulkCreateStockSummaryEntries: async (stockSummaryDataArray) => {
        try {
            if (!Array.isArray(stockSummaryDataArray) || !stockSummaryDataArray.length) {
                return { success: false, message: 'stockSummaryDataArray required' };
            }

            console.log(`[StockSummaryRepo] Bulk create: ${stockSummaryDataArray.length} records`);
            const createdStockSummarys = await StockMonthlySummary.bulkCreate(stockSummaryDataArray, { returning: true, validate: true });
            console.log(`[StockSummaryRepo] ✅ Success: ${createdStockSummarys.length} created`);
            return { success: true, data: createdStockSummarys, message: `${createdStockSummarys.length} stockSummary records created` };
        } catch (error) {
            console.error(`[StockSummaryRepo] Bulk create ERROR:`, error.message);
            return { success: false, message: error.message };
        }
    },

    getStockSummarys: async ({ page = 1, limit = 20, filters = {}, order = [['createdAt', 'DESC']] } = {}) => {
        try {
            const offset = (page - 1) * limit;
            const where = { ...filters };

            // Support date range filters
            if (filters.start_date || filters.end_date) {
                const dateCond = {};
                if (filters.start_date) dateCond[Op.gte] = filters.start_date;
                if (filters.end_date) dateCond[Op.lte] = filters.end_date;
                if (Object.keys(dateCond).length > 0) where.date = dateCond;
                delete where.start_date;
                delete where.end_date;
            }

            const { rows: data, count: total } = await StockMonthlySummary.findAndCountAll({
                where,
                order,
                limit,
                offset
            });

            return {
                success: true,
                data,
                meta: { total, page, limit, pages: Math.ceil(total / limit) }
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getStockSummaryById: async (id) => {
        try {
            const stockSummary = await StockMonthlySummary.findByPk(id);
            if (!stockSummary) return { success: false, message: 'StockSummary not found' };
            return { success: true, data: stockSummary };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateStockSummary: async (id, updateData) => {
        try {
            const stockSummary = await StockMonthlySummary.findByPk(id);
            if (!stockSummary) return { success: false, message: 'StockSummary not found' };
            await stockSummary.update(updateData);
            return { success: true, data: stockSummary, message: 'StockSummary updated successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateStockSummaryStatus: async (id, status) => {
        try {
            const stockSummary = await StockMonthlySummary.findByPk(id);
            if (!stockSummary) return { success: false, message: 'StockSummary not found' };
            await stockSummary.update({ status });
            return { success: true, data: stockSummary, message: 'StockSummary status updated successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    deleteStockSummary: async (id, deletedBy = null) => {
        try {
            const stockSummary = await StockMonthlySummary.findByPk(id);
            if (!stockSummary) return { success: false, message: 'StockSummary record not found' };
            await stockSummary.update({ status: 'DELETED', deletedBy });
            await stockSummary.destroy();
            return { success: true, message: 'StockSummary soft-deleted successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    hardDeleteStockSummary: async (id) => {
        try {
            const stockSummary = await StockMonthlySummary.findByPk(id, { paranoid: false });
            if (!stockSummary) return { success: false, message: 'StockSummary not found' };
            await stockSummary.destroy({ force: true });
            return { success: true, message: 'StockSummary permanently deleted' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // ============================================
    // Monthly Summary APIs (Transaction-Based)
    // ============================================

    /**
     * API 1: Specific Month Summary
     * Returns data for ONLY the selected month/year
     * Scopes: all | sku | variant
     */
    getSpecificMonthSummary: async ({ month, year, scope = 'all', sku = null, variant_id = null } = {}) => {
        try {
            if (!month || !year) {
                return { success: false, message: 'month and year are required' };
            }

            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            let where = {
                date: { [Op.gte]: startDate, [Op.lte]: endDate },
                status: 'ACTIVE'
            };

            if (scope === 'sku' && sku) {
                where.sku = sku;
            } else if (scope === 'variant' && variant_id) {
                where.variant_id = variant_id;
            }

            const transactions = await Stock.findAll({ where, raw: true });

            // Group by SKU and variant_id
            const grouped = {};
            transactions.forEach(tx => {
                const key = `${tx.sku}|${tx.variant_id}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        sku: tx.sku,
                        variant_id: tx.variant_id,
                        item_name: tx.item_name,
                        unit: tx.unit,
                        item_type: tx.item_type,
                        in_qty: 0,
                        out_qty: 0,
                        transactions: []
                    };
                }
                grouped[key].transactions.push(tx);
                if (tx.movement_type === 'IN') {
                    grouped[key].in_qty += Number(tx.qty || 0);
                } else if (tx.movement_type === 'OUT') {
                    grouped[key].out_qty += Number(tx.qty || 0);
                }
            });

            const summaries = Object.values(grouped).map(item => ({
                ...item,
                net_qty: item.in_qty - item.out_qty
            }));

            return {
                success: true,
                data: {
                    period: { month, year, startDate, endDate },
                    summaries
                },
                message: `Specific month summary for ${year}-${String(month).padStart(2, '0')}`
            };
        } catch (error) {
            console.error('Error in getSpecificMonthSummary:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * API 2: Cumulative Monthly Summary
     * Returns data for selected month + all preceding months
     * Scopes: all | sku | variant
     */
    getCumulativeMonthSummary: async ({ month, year, scope = 'all', sku = null, variant_id = null } = {}) => {
        try {
            if (!month || !year) {
                return { success: false, message: 'month and year are required' };
            }

            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            let where = {
                date: { [Op.lte]: endDate },
                status: 'ACTIVE'
            };

            if (scope === 'sku' && sku) {
                where.sku = sku;
            } else if (scope === 'variant' && variant_id) {
                where.variant_id = variant_id;
            }

            const transactions = await Stock.findAll({ where, raw: true });

            // Group by SKU and variant_id
            const grouped = {};
            transactions.forEach(tx => {
                const key = `${tx.sku}|${tx.variant_id}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        sku: tx.sku,
                        variant_id: tx.variant_id,
                        item_name: tx.item_name,
                        unit: tx.unit,
                        item_type: tx.item_type,
                        in_qty: 0,
                        out_qty: 0,
                        transactions: []
                    };
                }
                grouped[key].transactions.push(tx);
                if (tx.movement_type === 'IN') {
                    grouped[key].in_qty += Number(tx.qty || 0);
                } else if (tx.movement_type === 'OUT') {
                    grouped[key].out_qty += Number(tx.qty || 0);
                }
            });

            const summaries = Object.values(grouped).map(item => ({
                ...item,
                net_qty: item.in_qty - item.out_qty
            }));

            return {
                success: true,
                data: {
                    period: { month, year, startDate: 'All Historical', endDate, type: 'CUMULATIVE' },
                    summaries
                },
                message: `Cumulative summary through ${year}-${String(month).padStart(2, '0')}`
            };
        } catch (error) {
            console.error('Error in getCumulativeMonthSummary:', error);
            return { success: false, message: error.message };
        }
    },

    // ============================================
    // SKU List and Variant Operations
    // ============================================

    getSKUlist: async () => {
        try {
            const data = await StockMonthlySummary.findAll({
                attributes: ['sku', 'item_type', 'item_name'],
                group: ['sku', 'item_type', 'item_name']
            });
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getSKUlistForSummary: async ({ itemType = null, source = null, movement_type = null, year = null, month = null } = {}) => {
        try {
            const where = {};
            if (itemType) where.item_type = itemType;
            if (source) where.source = source;
            if (movement_type) where.movement_type = movement_type;

            if (year || month) {
                const sequelize = StockMonthlySummary.sequelize;
                const dateConds = [];
                if (year) dateConds.push(sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM date')), Op.eq, year));
                if (month) dateConds.push(sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM date')), Op.eq, month));
                if (dateConds.length > 0) where[Op.and] = dateConds;
            }

            const records = await StockMonthlySummary.findAll({
                attributes: [
                    'sku',
                    [StockMonthlySummary.sequelize.fn('MIN', StockMonthlySummary.sequelize.col('item_type')), 'item_type'],
                    [StockMonthlySummary.sequelize.fn('MIN', StockMonthlySummary.sequelize.col('item_name')), 'item_name'],
                    [StockMonthlySummary.sequelize.fn('COUNT', StockMonthlySummary.sequelize.col('id')), 'transaction_count'],
                    [StockMonthlySummary.sequelize.fn('SUM', StockMonthlySummary.sequelize.col('closing_qty')), 'total_quantity'],
                    [StockMonthlySummary.sequelize.fn('AVG', StockMonthlySummary.sequelize.col('closing_value')), 'avg_cost']
                ],
                where,
                group: ['sku'],
                raw: true,
                subQuery: false,
                order: [[StockMonthlySummary.sequelize.literal('transaction_count'), 'DESC']]
            });

            return {
                success: true,
                data: records,
                meta: { total: records.length, filters: { itemType, source, movement_type, year, month } }
            };
        } catch (error) {
            console.error('[StockSummaryRepo] getSKUlistForSummary ERROR:', error.message);
            return { success: false, message: error.message };
        }
    },

    getVariantsByGroupedSKU: async ({ sku, itemType = null } = {}) => {
        try {
            if (!sku) return { success: false, message: 'SKU is required' };

            const where = { sku };
            if (itemType) where.item_type = itemType;

            const variants = await StockMonthlySummary.findAll({
                attributes: ['id', 'fk_id', 'sku', 'item_type', 'item_name', 'closing_qty', 'closing_value', 'date'],
                where,
                order: [['date', 'DESC']],
                raw: true
            });

            const groupedByVariant = {};
            variants.forEach(v => {
                if (!groupedByVariant[v.fk_id]) {
                    groupedByVariant[v.fk_id] = {
                        fk_id: v.fk_id,
                        sku: v.sku,
                        item_type: v.item_type,
                        item_name: v.item_name,
                        latest_date: v.date,
                        closing_qty: v.closing_qty,
                        closing_value: v.closing_value,
                        records_count: 0
                    };
                }
                groupedByVariant[v.fk_id].records_count += 1;
            });

            const uniqueVariants = Object.values(groupedByVariant);
            return {
                success: true,
                data: uniqueVariants,
                meta: { total: uniqueVariants.length, sku, itemType, total_transactions: variants.length }
            };
        } catch (error) {
            console.error('[StockSummaryRepo] getVariantsByGroupedSKU ERROR:', error.message);
            return { success: false, message: error.message };
        }
    },

    // ============================================
    // Stock Summary View APIs
    // ============================================

    getLatestSummaryByVariant: async (variant_id, ending_month, end_year) => {
        try {
            let where = {
                variant_id: variant_id,
                date: { [Op.lte]: new Date(end_year, ending_month, 0) }
            };
            const stockSummary = await StockMonthlySummary.findAll({ where, order: [['date', 'DESC']] });
            if (!stockSummary) return { success: false, message: 'StockSummary not found' };
            return { success: true, data: stockSummary };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getStockSummaryViewBySku: async ({ sku, start_year, start_month, end_year, end_month }) => {
        try {
            console.log('getStockSummaryViewBySku Params:', { sku, start_year, start_month, end_year, end_month });
            if (!sku) return { success: false, message: 'SKU is required' };

            const startDate = new Date(start_year, start_month - 1, 1);
            const endDate = new Date(end_year, end_month, 1);

            // Get opening balance from previous month's summary
            const openingSummary = await StockMonthlySummary.findOne({
                where: { sku, date: { [Op.lt]: startDate } },
                order: [['date', 'DESC']]
            });

            console.log('Opening Summary:', openingSummary);
            let opening_qty = openingSummary ? Number(openingSummary.closing_qty) || 0 : 0;
            let opening_value = openingSummary ? Number(openingSummary.closing_value) || 0 : 0;
            console.log('Opening Qty & Value:', opening_qty, opening_value);

            // Get transactions for the period from Stock model
            const transactions = await Stock.findAll({
                where: { sku, date: { [Op.gte]: startDate, [Op.lt]: endDate } },
                attributes: ['id', 'date', 'movement_type', 'source', 'qty', 'batch_number', 'cost'],
                order: [['date', 'DESC'], ['id', 'DESC']]
            });

            const itemDetails = await Stock.findOne({ where: { sku } });

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
            }

            transactionsList.push(...transactions.map(t => ({
                id: t.id,
                date: t.date,
                movement_type: t.movement_type,
                source: t.source,
                qty: t.qty,
                batch_number: t.batch_number
            })));

            return {
                success: true,
                data: {
                    item: {
                        sku,
                        item_name: itemDetails?.item_name || null,
                        unit: itemDetails?.unit || null,
                        item_type: itemDetails?.item_type || null
                    },
                    period: {
                        startDate: startDate.toISOString().split('T')[0],
                        endDate: endDate.toISOString().split('T')[0]
                    },
                    transactions: transactionsList
                }
            };
        } catch (error) {
            console.error('[StockSummaryRepo] getStockSummaryViewBySku ERROR:', error);
            return { success: false, message: error.message };
        }
    },

    getStackedStockSummaryView: async ({ sku = null, start_year, start_month, end_year, end_month }) => {
        try {
            console.log('getStackedStockSummaryView Params:', { sku, start_year, start_month, end_year, end_month });
            
            let skuListResult = await StockSummaryRepo.getSKUlist();
            let skuList = skuListResult.data;

            if (sku) {
                skuList = skuList.filter(item => (item.dataValues?.sku || item.sku) === sku);
            }

            console.log('SKU LIST:', skuList.length);

            const startDate = new Date(start_year, start_month - 1, 1);
            const endDate = new Date(end_year, end_month, 1);

            const transactionsListStacked = [];

            for (const instance of skuList) {
                const currentSku = instance.dataValues?.sku || instance.sku;

                const openingSummary = await StockMonthlySummary.findOne({
                    where: { sku: currentSku, date: { [Op.lt]: startDate } },
                    order: [['date', 'DESC']]
                });

                let opening_qty = openingSummary ? Number(openingSummary.closing_qty) || 0 : 0;

                const transactions = await Stock.findAll({
                    where: { sku: currentSku, date: { [Op.gte]: startDate, [Op.lt]: endDate } },
                    attributes: ['id', 'date', 'movement_type', 'source', 'qty', 'batch_number', 'cost'],
                    order: [['date', 'DESC'], ['id', 'DESC']]
                });

                const itemDetails = await Stock.findOne({ where: { sku: currentSku } });
                const transactionsList = [];

                if (openingSummary && opening_qty !== 0) {
                    transactionsList.push({
                        id: 0,
                        date: new Date(startDate.getFullYear(), startDate.getMonth(), 0).toISOString().split('T')[0],
                        movement_type: 'IN',
                        source: 'opening_balance',
                        qty: opening_qty,
                        batch_number: `stock_summary-${openingSummary.id}`
                    });
                }

                if (Array.isArray(transactions) && transactions.length > 0) {
                    transactionsList.push(...transactions.map(t => ({
                        id: t.id,
                        date: t.date,
                        movement_type: t.movement_type,
                        source: t.source,
                        qty: t.qty,
                        batch_number: t.batch_number
                    })));
                }

                transactionsListStacked.push({
                    item: {
                        sku: currentSku,
                        item_name: itemDetails?.item_name || null,
                        unit: itemDetails?.unit || null,
                        item_type: itemDetails?.item_type || null
                    },
                    stock_records: transactionsList
                });
            }

            console.log(`Stacked Response Summary: ${transactionsListStacked.length} SKUs processed`);

            return {
                success: true,
                data: {
                    period: {
                        startDate: startDate.toISOString().split('T')[0],
                        endDate: endDate.toISOString().split('T')[0]
                    },
                    transactions: transactionsListStacked
                }
            };
        } catch (error) {
            console.error('[StockSummaryRepo] getStackedStockSummaryView ERROR:', error);
            return { success: false, message: error.message };
        }
    },

    // ============================================
    // Summary Generation Helpers
    // ============================================

    /**
     * Get summary by exact date (for checking if summary exists)
     */
    getSummaryByExactDate: async ({ sku = null, variant_id = null, date }) => {
        try {
            let where = { date };

            if (sku) {
                where.sku = sku;
            }
            if (variant_id) {
                where.variant_id = variant_id;
            }

            const summary = await StockMonthlySummary.findOne({
                where,
                raw: true
            });

            if (!summary) {
                return { success: false, message: 'Summary not found' };
            }

            return { success: true, data: summary };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    /**
     * Get latest summary by period (for opening stock calculation)
     * Looks for the exact month's summary OR the latest summary before it
     */
    getLatestSummaryByPeriod: async ({ sku = null, variant_id = null, month, year }) => {
        try {
            // First, try to find exact month's summary (e.g., Oct 2025 for Nov request)
            const exactDate = `${year}-${String(month).padStart(2, '0')}-01`;

            let where = { date: exactDate };

            if (sku) {
                where.sku = sku;
            }
            if (variant_id) {
                where.variant_id = variant_id;
            }

            // Check for exact month first
            let summary = await StockMonthlySummary.findOne({
                where,
                raw: true
            });

            // If not found, look for the latest summary before this month
            if (!summary) {
                const targetDate = new Date(year, month - 1, 1);
                where = { date: { [Op.lt]: targetDate } };
                
                if (sku) {
                    where.sku = sku;
                }
                if (variant_id) {
                    where.variant_id = variant_id;
                }

                summary = await StockMonthlySummary.findOne({
                    where,
                    order: [['date', 'DESC']],
                    raw: true
                });
            }

            if (!summary) {
                return { success: false, message: 'No previous summary found' };
            }

            return { success: true, data: summary };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    /**
     * Upsert stock summary (create or update)
     * Uses actual database columns: date, sku, variant_id
     */
    upsertStockSummary: async (summaryData) => {
        try {
            // Build where clause based on actual database columns
            const where = {
                date: summaryData.date,
                sku: summaryData.sku || null,
                variant_id: summaryData.variant_id || null
            };

            // Only include fields that exist in the database
            const dbData = {
                date: summaryData.date,
                sku: summaryData.sku,
                variant_id: summaryData.variant_id,
                item_type: summaryData.item_type,
                item_name: summaryData.item_name,
                fk_id: summaryData.fk_id,
                opening_qty: summaryData.opening_stock || summaryData.opening_qty || 0,
                in_qty: summaryData.total_in || summaryData.in_qty || 0,
                out_qty: summaryData.total_out || summaryData.out_qty || 0,
                closing_qty: summaryData.closing_stock || summaryData.closing_qty || 0,
                opening_value: summaryData.opening_value || 0,
                in_value: summaryData.in_value || 0,
                out_value: summaryData.out_value || 0,
                closing_value: summaryData.closing_value || 0,
                unit: summaryData.unit,
                createdBy: summaryData.createdBy
            };

            const [summary, created] = await StockMonthlySummary.findOrCreate({
                where,
                defaults: dbData
            });

            if (!created) {
                await summary.update(dbData);
            }

            return {
                success: true,
                data: summary,
                message: created ? 'Stock summary created' : 'Stock summary updated'
            };
        } catch (error) {
            console.error('Error in upsertStockSummary:', error);
            return { success: false, message: error.message };
        }
    },

    // ============================================
    // Search and Utility Methods
    // ============================================

    searchStockSummarys: async ({ searchTerm = '', page = 1, limit = 20 } = {}) => {
        try {
            const offset = (page - 1) * limit;
            const where = {
                [Op.or]: [
                    { item_name: { [Op.iLike]: `%${searchTerm}%` } },
                    { sku: { [Op.iLike]: `%${searchTerm}%` } }
                ]
            };
            const { rows: data, count: total } = await StockMonthlySummary.findAndCountAll({
                where,
                limit,
                offset,
                order: [['date', 'DESC']]
            });
            return {
                success: true,
                data,
                meta: { total, page, limit, pages: Math.ceil(total / limit) }
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getStockSummarySKURecords: async (where) => {
        try {
            const { sku, year, month } = where;
            const filter = { sku };
            if (year && month) {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0);
                filter.date = { [Op.between]: [startDate, endDate] };
            }
            const records = await StockMonthlySummary.findAll({ where: filter, order: [['date', 'DESC']] });
            return { success: true, data: records };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getLatestSnapshotInfo: async () => {
        try {
            const row = await StockMonthlySummary.findOne({ order: [['date', 'DESC']] });
            if (!row) return { success: true, data: null };
            const dateObj = new Date(row.date);
            return { success: true, data: { year: dateObj.getFullYear(), month: dateObj.getMonth() + 1, date: row.date } };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};

export default StockSummaryRepo;
