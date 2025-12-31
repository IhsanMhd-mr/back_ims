import StockCurrentRepo from '../repositories/stockCurrent.repository.js';
import StockSummaryRepo from '../repositories/stockSummary.repository.js';
import StockRepo from '../repositories/stock.repository.js';

const StockCurrentService = {
        /**
         * Get all current stock values (optionally filter by item_type, sku, variant_id)
         */
        getAllCurrentValues: async (filters = {}) => {
            return await StockCurrentRepo.getAllCurrentValues(filters);
        },
    /**
     * Bulk process to update current stock values for all items
     * @param {Object} stockCurrentData
     * @param {string} [stockCurrentData.mode] - 'sku' (default: 'variant')
     */
    initiateBulkSummaryProcessing: async (stockCurrentData = {}) => {
        const mode = stockCurrentData.mode || 'variant';
        if (mode === 'sku') {
            return await StockCurrentService.processBulkBySku();
        } else {
            return await StockCurrentService.processBulkByVariant();
        }
    },

    /**
     * Bulk process to update current stock values for all items (variant-by-variant)
     */
    processBulkByVariant: async () => {
        try {
            const productsResult = await StockCurrentRepo.getAllProductVariants();
            const materialsResult = await StockCurrentRepo.getAllMaterialVariants();
            if (!productsResult?.success || !materialsResult?.success) {
                return { success: false, message: 'Failed to fetch products or materials' };
            }
            const allVariants = [
                ...productsResult.data,
                ...materialsResult.data
            ];
            if (!allVariants.length) {
                return { success: false, message: 'No variants found for processing' };
            }
            let processed = 0, updated = 0, created = 0, failed = 0;
            for (const v of allVariants) {
                try {
                    const { item_type, fk_id, sku, variant_id, item_name, unit } = v;
                    processed++;
                    // Get last summary
                    const lastSummaryResult = await StockSummaryRepo.getLatestSummaryByPeriod({ sku, variant_id });
                    let lastSummary = null;
                    let fromDate = null;
                    if (lastSummaryResult.success && lastSummaryResult.data) {
                        lastSummary = lastSummaryResult.data;
                        fromDate = new Date(lastSummary.date);
                        fromDate.setMonth(fromDate.getMonth() + 1);
                        fromDate.setDate(1);
                    }
                    let recordsResult;
                    if (fromDate) {
                        recordsResult = await StockRepo.getStocks({
                            filters: { sku, variant_id, status: 'ACTIVE', start_date: fromDate.toISOString().split('T')[0] },
                            limit: 10000
                        });
                    } else {
                        recordsResult = await StockRepo.getStocks({
                            filters: { sku, variant_id, status: 'ACTIVE' },
                            limit: 10000
                        });
                    }
                    const stockRecords = recordsResult.data || [];
                    if (stockRecords.length === 0) continue;
                    let current_quantity = 0;
                    let last_movement_date = null;
                    let last_cost = 0;
                    if (lastSummary) current_quantity = Number(lastSummary.closing_qty) || 0;
                    for (const record of stockRecords) {
                        const qty = Number(record.qty || 0);
                        const cost = Number(record.unit_cost || 0);
                        if (record.movement_type === 'IN') current_quantity += qty;
                        else if (record.movement_type === 'OUT') current_quantity -= qty;
                        last_movement_date = record.date;
                        if (cost > 0) last_cost = cost;
                    }
                    current_quantity = Math.max(0, current_quantity);
                    const updateData = { item_type, fk_id, sku, variant_id, item_name, unit, current_quantity, last_movement_date, last_cost };
                    const updateResult = await StockCurrentRepo.upsertStockCurrentValue(updateData);
                    if (updateResult.success) {
                        if (updateResult.message.includes('updated')) updated++;
                        else created++;
                    } else {
                        failed++;
                    }
                } catch (err) {
                    failed++;
                }
            }
            return { success: true, message: 'Variant-by-variant processing complete', processed, updated, created, failed };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    /**
     * Bulk process to update current stock values for all items (sku-by-sku)
     */
    processBulkBySku: async () => {
        try {
            const productsResult = await StockCurrentRepo.getAllProductVariants();
            const materialsResult = await StockCurrentRepo.getAllMaterialVariants();
            if (!productsResult?.success || !materialsResult?.success) {
                return { success: false, message: 'Failed to fetch products or materials' };
            }
            const allVariants = [
                ...productsResult.data,
                ...materialsResult.data
            ];
            if (!allVariants.length) {
                return { success: false, message: 'No variants found for processing' };
            }
            // Group by SKU
            const skuMap = {};
            for (const item of allVariants) {
                if (!skuMap[item.sku]) skuMap[item.sku] = [];
                skuMap[item.sku].push(item);
            }
            
            let processed = 0, updated = 0, created = 0, failed = 0;
            for (const sku of Object.keys(skuMap)) {
                const variants = skuMap[sku];
                for (const v of variants) {
                    try {
                        const { item_type, fk_id, sku, variant_id, item_name, unit } = v;
                        processed++;
                        const lastSummaryResult = await StockSummaryRepo.getLatestSummaryByPeriod({ sku, variant_id });
                        let lastSummary = null;
                        let fromDate = null;
                        if (lastSummaryResult.success && lastSummaryResult.data) {
                            lastSummary = lastSummaryResult.data;
                            fromDate = new Date(lastSummary.date);
                            fromDate.setMonth(fromDate.getMonth() + 1);
                            fromDate.setDate(1);
                        }
                        let recordsResult;
                        if (fromDate) {
                            recordsResult = await StockRepo.getStocks({
                                filters: { sku, variant_id, status: 'ACTIVE', start_date: fromDate.toISOString().split('T')[0] },
                                limit: 10000
                            });
                        } else {
                            recordsResult = await StockRepo.getStocks({
                                filters: { sku, variant_id, status: 'ACTIVE' },
                                limit: 10000
                            });
                        }
                        const stockRecords = recordsResult.data || [];
                        if (stockRecords.length === 0) continue;
                        let current_quantity = 0;
                        let last_movement_date = null;
                        let last_cost = 0;
                        if (lastSummary) current_quantity = Number(lastSummary.closing_qty) || 0;
                        for (const record of stockRecords) {
                            const qty = Number(record.qty || 0);
                            const cost = Number(record.unit_cost || 0);
                            if (record.movement_type === 'IN') current_quantity += qty;
                            else if (record.movement_type === 'OUT') current_quantity -= qty;
                            last_movement_date = record.date;
                            if (cost > 0) last_cost = cost;
                        }
                        current_quantity = Math.max(0, current_quantity);
                        const updateData = { item_type, fk_id, sku, variant_id, item_name, unit, current_quantity, last_movement_date, last_cost };
                        const updateResult = await StockCurrentRepo.upsertStockCurrentValue(updateData);
                        if (updateResult.success) {
                            if (updateResult.message.includes('updated')) updated++;
                            else created++;
                        } else {
                            failed++;
                        }
                    } catch (err) {
                        failed++;
                    }
                }
            }
            return { success: true, message: 'SKU-by-SKU processing complete', processed, updated, created, failed };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },
}

export default StockCurrentService;
