import express from 'express';
import StockCurrentController from '../controllers/stockCurrent.controller.js';

const router = express.Router();

router.post('/process-bulk-summary', StockCurrentController.initiateBulkSummaryProcessing);
router.get('/process-bulk-summary', StockCurrentController.getAllCurrentValues);

// GET all current stock values (optionally filter by ?item_type=PRODUCT&sku=...)
router.get('/current-values', StockCurrentController.getAllCurrentValues);
// router.post('/process-bulk-summary', StockCurrentController.refreshUpdateBulkSummary);

export default router;
