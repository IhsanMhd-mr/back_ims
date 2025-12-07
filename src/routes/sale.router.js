import express from 'express';
import SaleController from '../controllers/sale.controller.js';
import BillController from '../controllers/bill.controller.js';


const router = express.Router();

router.post('/add', BillController.create);
router.get('/getAll', BillController.getAll);
router.get('/getByNumber/:bill_number', BillController.getByNumber);
router.put('/put/:id', BillController.update);
router.delete('/admin_delete/:id', BillController.delete);

export default router;
