import express from 'express';
import StockController from '../controllers/stock.controller.js';
import StockValueController from '../controllers/stockValue.controller.js';
import StockSummaryController from '../controllers/stockSummary.controller.js';

const router = express.Router();
// --- Ledger (stock transactions) -----------------------------------------
router.post('/add', StockController.create);
router.post('/bulk', StockController.bulkCreate);
router.get('/getAll', StockController.getAll);
router.get('/statuses', StockController.statuses);
router.get('/skus', StockController.skus);
// period-aware listing: supports named `period` (today, this_month, last_three_months) and `asOf`
router.get('/period', StockController.getByPeriod);
router.get('/get/:id', StockController.getById);
router.get('/search', StockController.search);

// --- Movement tracking (filter by movement_type and source) -------
// GET /stock/movements?movement_type=in&source=purchase&page=1&limit=20
// GET /stock/movements?movement_type=out&source=sales
router.get('/movements', StockController.getAll); // reuses getAll with filters

// --- Adjustments (manual adjustments with notes/audit) -------------------
router.post('/adjust', StockController.adjust);

// --- Production / Conversion --------------------------------------------
// Convert materials into produced products
router.post('/convert', StockController.convert);

// --- Sales (reduce stock on sale) --------------------------------------
router.post('/sell', StockController.sell);

// --- Snapshots / Milestones (monthly summaries) -------------------------
router.get('/summary', StockController.summary);
router.post('/milestone', StockController.createMilestone);
router.get('/milestone/:year/:month', StockController.getMilestone);
// last three months view: snapshot before window + ledger records for window
router.get('/last_three_months', StockController.lastThreeMonths);

// --- Monthly summaries CRUD (light admin endpoints)
router.get('/monthly-summaries', StockSummaryController.list);
router.get('/monthly-summaries/:id', StockSummaryController.getById);
router.post('/monthly-summaries', StockSummaryController.create);
router.patch('/monthly-summaries/:id', StockSummaryController.update);
router.post('/monthly-summaries/bulk-upsert', StockSummaryController.bulkUpsert);
router.post('/monthly-summaries/generate-from-last-month', StockSummaryController.generateFromLastMonth);
router.post('/monthly-summaries/generate-daily', StockSummaryController.generateDailyForMonth);

// --- Current stock monetary values (per-item) ---------------------------
router.get('/current-values', StockValueController.list);
router.get('/current-values/:item_type/:fk_id', StockValueController.getByItem);
router.post('/current-values/upsert', StockValueController.upsert);
router.post('/current-values/refresh', StockValueController.refresh);

// --- Admin / maintenance -----------------------------------------------
router.put('/put/:id', StockController.update); // update updated by
router.patch('/status/:id/:params', StockController.statusUpdate);//update status
router.patch('/remove/:id', StockController.remove); //status delete deleted by
router.delete('/admin_delete/:id', StockController.adminDelete); // normal delete

export default router; 