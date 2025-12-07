import StockRepo from '../repositories/stock.repository.js';

const StockService = {
    addStock: async (stockData) => {
        try {
            const result = await StockRepo.createStockEntry(stockData);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    addStockBulk: async (stockDataArray) => {
        try {
            if (!Array.isArray(stockDataArray) || stockDataArray.length === 0) {
                return { success: false, message: 'stockDataArray must be a non-empty array' };
            }
            const result = await StockRepo.bulkCreateStockEntries(stockDataArray);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getStocks: async (filters = {}) => {
        try {
            const result = await StockRepo.getStocks(filters);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    getStockById: async (id) => {
        try {
            const result = await StockRepo.getStockById(id);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateStock: async (id, updateData) => {
        try {
            const result = await StockRepo.updateStock(id, updateData);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateStockStatus: async (id, status) => {
        try {
            const result = await StockRepo.updateStockStatus(id, status);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    deleteStock: async (id) => {
        try {
            const result = await StockRepo.deleteStock(id);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    createStockFromBillCompletion: async (bill, user_id) => {
        try {
            if (!bill?.items?.length) {
                return { success: false, message: 'No bill items' };
            }

            const { id: billId, bill_number: billNumber, items } = bill;
            console.log(`[STOCK] START: ${billNumber}(${billId}) → ${items.length} items | User: ${user_id}`);

            // Map bill items to stock entries
            const stockEntries = items.map(item => ({
                item_type: 'PRODUCT',
                fk_id: item.product_id,
                sku: item.sku,
                variant_id: item.variant_id,
                item_name: item.product_name,
                batch_number: billNumber,
                qty: item.quantity,
                cost: Number(item.unit_price) || 0,
                movement_type: 'OUT',
                source: 'SALES',
                description: `Sale from Bill ${billNumber}`,
                date: new Date().toISOString().split('T')[0],
                status: 'COMPLETED',
                createdBy: user_id
            }));

            console.log(`[STOCK] Prepared: ${stockEntries.length} entries ready for bulk create`);
            const result = await StockRepo.bulkCreateStockEntries(stockEntries);
            
            if (result.success) {
                console.log(`[STOCK] ✅ SUCCESS: ${billNumber} | Created: ${result.data?.length} | Approved: User ${user_id}`);
            } else {
                console.log(`[STOCK] ❌ FAILED: ${billNumber} | Error: ${result.message}`);
            }
            
            return result;
        } catch (error) {
            console.error(`[STOCK] ERROR:`);
            console.error(`├─ Bill: ${bill?.bill_number || 'N/A'}`);
            console.error(`├─ User: ${user_id}`);
            console.error(`├─ Message: ${error.message}`);
            console.error(`└─ Stack: ${error.stack}`);
            return { success: false, message: error.message };
        }
    },

    searchStocks: async (searchTerm) => {
        try {
            const result = await StockRepo.searchStocks(searchTerm);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};

export default StockService;