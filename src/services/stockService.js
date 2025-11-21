import StockRepo from '../repositories/stockRepository.js';

const StockService = {
    addStock: async (stockData) => {
        try {
            const result = await StockRepo.createStockEntry(stockData);
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