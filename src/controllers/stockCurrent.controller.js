
import StockCurrentService from '../services/stockCurrent.service.js';
import StockRepo from '../repositories/stock.repository.js';

// Helper functions for date parsing
function parseYear(date) {
    return date.getFullYear();
}
function parseMonth(date) {
    // Returns 1-based month (1-12)
    return date.getMonth() + 1;
}

const StockCurrentController = {

    // GET /stock/current-values
    getAllCurrentValues: async (req, res) => {
        try {
            const filters = req.query || {};
            const result = await StockCurrentService.getAllCurrentValues(filters);
            if (result.success) return res.status(200).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    initiateBulkSummaryProcessing: async (req, res) => {
        try {
            const current_date = new Date();
            let dateRange = {
                start_year: parseYear(current_date),
                start_month: parseMonth(current_date),
                end_year: parseYear(current_date),
                end_month: parseMonth(current_date)
            };
            const initPayload = await StockRepo.getStackedStockView(dateRange);
            const payload = {};
            // payload.data = initPayload;
            const result = await StockCurrentService.initiateBulkSummaryProcessing(payload);
            if (result.success) return res.status(201).json(result);
            return res.status(400).json(result);
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
};

export default StockCurrentController;
