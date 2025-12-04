import express from 'express';
import StockController from '../controllers/stock.controller.js';

const router = express.Router();
// --- Ledger (stock transactions) -----------------------------------------
router.post('/add', StockController.create);
router.get('/getAll', StockController.getAll);
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

// --- Admin / maintenance -----------------------------------------------
router.put('/put/:id', StockController.update); // update updated by
router.patch('/status/:id/:params', StockController.statusUpdate);//update status
router.patch('/remove/:id', StockController.remove); //status delete deleted by
router.delete('/admin_delete/:id', StockController.adminDelete); // normal delete

export default router; 