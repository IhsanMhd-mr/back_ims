import StockCurrentRepo from '../repositories/stockCurrent.repository.js';

const StockCurrentService = {


    initiateBulkSummaryProcessing: async (stockCurrentData) => {
        try {
            const result = await StockCurrentRepo.initiateBulkSummaryProcessing(stockCurrentData);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

export default StockCurrentService;
