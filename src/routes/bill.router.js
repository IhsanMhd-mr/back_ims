import express from 'express';
import BillController from '../controllers/bill.controller.js';

const router = express.Router();

router.post('/add', BillController.create);
router.get('/getAll', BillController.getAll);
router.get('/getByNumber/:bill_number', BillController.getByNumber);
router.get('/get/:id', BillController.getById);
router.put('/put/:id', BillController.update);
router.patch('/status_handle/:id/:status', BillController.statusHandle);
router.delete('/admin_delete/:id', BillController.delete);

export default router;
