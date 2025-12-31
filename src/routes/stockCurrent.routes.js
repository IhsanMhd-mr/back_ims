import express from 'express';
import StockCurrentController from '../controllers/stockCurrent.controller.js';

const router = express.Router();

router.post('/process-bulk-summary', StockCurrentController.initiateBulkSummaryProcessing);
// router.post('/process-bulk-summary', StockCurrentController.refreshUpdateBulkSummary);

export default router;
