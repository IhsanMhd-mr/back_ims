import express from 'express';
import StockController from '../controllers/stock.controller.js';

const router = express.Router();
// --- Ledger (stock transactions) -----------------------------------------
router.post('/add', StockController.create);
router.get('/getAll', StockController.getAll);
// period-aware listing: supports named `period` (today, this_month, last_three_months) and `asOf`
router.get('/period', StockController.getByPeriod);
router.get('/get/:id', StockController.getById);
router.get('/search', StockController.search);

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

// --- Admin / maintenance -----------------------------------------------
router.put('/put/:id', StockController.update); // update updated by
router.patch('/status/:id/:params', StockController.statusUpdate);//update status
router.patch('/remove/:id', StockController.remove); //status delete deleted by
router.delete('/admin_delete/:id', StockController.adminDelete); // normal delete

export default router; 