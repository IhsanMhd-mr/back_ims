import express from 'express';
import StockController from '../controllers/stock.controller.js';

const router = express.Router();

router.post('/add', StockController.create);
router.get('/getAll', StockController.getAll);
router.get('/search', StockController.search);
router.get('/get/:id', StockController.getById);
router.put('/put/:id', StockController.update); // update updated by
router.patch('/status/:id/:params', StockController.statusUpdate);//update status
router.patch('/remove/:id', StockController.remove); //status delete deleted by
router.delete('/admin_delete/:id', StockController.adminDelete); // normal delete

export default router; 