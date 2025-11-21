import express from 'express';
import SaleController from '../controllers/sale.controller.js';

const router = express.Router();

router.post('/add', SaleController.create);
router.get('/getAll', SaleController.getAll);
router.get('/get/:id', SaleController.getById);
router.put('/put/:id', SaleController.update);
router.delete('/admin_delete/:id', SaleController.delete);

export default router;
